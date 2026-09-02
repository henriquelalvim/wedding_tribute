// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title WeddingGift
/// @notice An on-chain wedding on Base. The groom proposes, the bride accepts, and
///         guests fund the couple's gift at any point. Once married, either spouse
///         may withdraw the whole balance.
/// @dev There is no owner, no pause and no upgrade path: nothing here can hold the
///      couple's gift hostage. The privileged addresses are the three immutables set
///      at deployment: groom, bride, and whoever sent the deployment transaction.
contract WeddingGift {
    /// @notice Where the ceremony currently stands.
    enum Status {
        Pending, // no proposal yet
        Proposed, // the groom proposed, waiting on the bride
        Married // she said yes
    }

    /// @notice Maximum size, in bytes, of any vow, dedication or gift message.
    /// @dev Keeps the celebration event cheap to emit and the UI predictable.
    uint256 public constant MAX_MESSAGE_LENGTH = 280;

    address public immutable groom;
    address public immutable bride;
    /// @notice Whoever sent the deployment transaction — typically the friend who is
    ///         actually funding the gift, not the couple. Also allowed to set the
    ///         dedication, since in practice they are the one making the deposit that
    ///         carries it.
    address public immutable deployer;

    Status public status;
    /// @notice Block timestamp of the moment the bride accepted. Zero until then.
    uint256 public marriedAt;
    string public groomVow;
    string public brideVow;
    /// @notice A message attached to a gift deposit from the groom, the bride or the
    ///         deployer, read out with the vows when the marriage is celebrated.
    string public dedication;

    /// @notice Everything the frontend needs, in a single RPC call.
    struct Summary {
        Status status;
        uint256 balance;
        uint256 marriedAt;
        address groom;
        address bride;
        address deployer;
        string groomVow;
        string brideVow;
        string dedication;
    }

    event Proposal(address indexed groom, string vow, uint256 timestamp);
    event GiftReceived(address indexed from, uint256 amount, string message, uint256 timestamp);
    event GiftWithdrawn(address indexed to, uint256 amount, uint256 timestamp);
    event MarriageCelebrated(
        address groom,
        address bride,
        uint256 timestamp,
        uint256 totalAmount,
        string groomVow,
        string brideVow,
        string dedication
    );

    error InvalidCouple();
    error NotGroom();
    error NotBride();
    error NotCouple();
    error InvalidStatus();
    error EmptyGift();
    error NothingToWithdraw();
    error MessageTooLong();
    error TransferFailed();

    constructor(address groom_, address bride_) {
        if (groom_ == address(0) || bride_ == address(0) || groom_ == bride_) {
            revert InvalidCouple();
        }
        groom = groom_;
        bride = bride_;
        deployer = msg.sender;
    }

    /// @notice The groom asks. Callable again while still Proposed, so a typo in the
    ///         vow can be fixed before she answers; locked forever once married.
    function propose(string calldata vow) external {
        if (msg.sender != groom) revert NotGroom();
        if (status == Status.Married) revert InvalidStatus();
        _checkLength(vow);

        groomVow = vow;
        status = Status.Proposed;

        emit Proposal(msg.sender, vow, block.timestamp);
    }

    /// @notice The bride says yes. This is the transaction the whole page waits for.
    function accept(string calldata vow) external {
        if (msg.sender != bride) revert NotBride();
        if (status != Status.Proposed) revert InvalidStatus();
        _checkLength(vow);

        brideVow = vow;
        status = Status.Married;
        marriedAt = block.timestamp;

        emit MarriageCelebrated(
            groom,
            bride,
            block.timestamp,
            address(this).balance,
            groomVow,
            vow,
            dedication
        );
    }

    /// @notice Send a gift to the couple, with an optional message.
    /// @dev Open to everyone, before or after the wedding.
    function depositGift(string calldata message) external payable {
        _checkLength(message);
        _registerGift(message);
    }

    /// @notice Plain ETH transfers are treated as a gift with no message.
    receive() external payable {
        _registerGift("");
    }

    /// @notice Sends the entire balance to whoever calls it, groom or bride.
    /// @dev Only after the wedding. Reentrancy is a non-issue: the balance is already
    ///      zero while the recipient's fallback runs, so a reentrant call reverts with
    ///      NothingToWithdraw.
    function withdrawGift() external {
        if (msg.sender != groom && msg.sender != bride) revert NotCouple();
        if (status != Status.Married) revert InvalidStatus();

        uint256 amount = address(this).balance;
        if (amount == 0) revert NothingToWithdraw();

        (bool sent, ) = msg.sender.call{value: amount}("");
        if (!sent) revert TransferFailed();

        emit GiftWithdrawn(msg.sender, amount, block.timestamp);
    }

    /// @notice Current gift balance held by the contract, in wei.
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /// @notice The whole ceremony state in one call, so the public RPC is hit once
    ///         per poll instead of seven times.
    function summary() external view returns (Summary memory) {
        return
            Summary({
                status: status,
                balance: address(this).balance,
                marriedAt: marriedAt,
                groom: groom,
                bride: bride,
                deployer: deployer,
                groomVow: groomVow,
                brideVow: brideVow,
                dedication: dedication
            });
    }

    function _registerGift(string memory message) private {
        if (msg.value == 0) revert EmptyGift();

        // Only the couple or the deployer write the dedication; a guest's note lives
        // in the event log alone. An empty message never wipes a dedication already set.
        bool canDedicate = msg.sender == groom || msg.sender == bride || msg.sender == deployer;
        if (bytes(message).length > 0 && canDedicate) {
            dedication = message;
        }

        emit GiftReceived(msg.sender, msg.value, message, block.timestamp);
    }

    function _checkLength(string calldata text) private pure {
        if (bytes(text).length > MAX_MESSAGE_LENGTH) revert MessageTooLong();
    }
}
