// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title WeddingGift
/// @notice An on-chain wedding on Base. The groom proposes, the bride accepts, and
///         anyone — guests included — may leave a tribute on the public guestbook.
/// @dev There is no owner, no pause and no upgrade path. The deployer is the one
///      privileged address, but only to assign the couple's addresses once (they
///      don't exist until the groom/bride log in for the first time) and to hide an
///      abusive tribute — it can never block a proposal, an acceptance, or anyone's
///      right to leave a tribute of their own.
contract WeddingGift {
    /// @notice Where the ceremony currently stands.
    enum Status {
        Pending, // no proposal yet
        Proposed, // the groom proposed, waiting on the bride
        Married // she said yes
    }

    /// @notice Maximum size, in bytes, of a vow or a tribute message.
    uint256 public constant MAX_MESSAGE_LENGTH = 280;

    /// @notice Maximum size, in bytes, of a name — the groom's, the bride's, or a
    ///         tribute's signature. A name, not a second message.
    uint256 public constant MAX_NAME_LENGTH = 64;

    /// @notice Whoever sent the deployment transaction. The only address allowed to
    ///         assign the couple or hide a tribute.
    address public immutable deployer;

    /// @notice The couple. Unset (zero address) until the deployer assigns them —
    ///         their wallet doesn't exist until they log in for the first time, so it
    ///         can't be fixed at construction time the way it used to be.
    address public groom;
    address public bride;

    Status public status;
    /// @notice Block timestamp of the moment the bride accepted. Zero until then.
    uint256 public marriedAt;
    /// @notice How each of them signs their own vow — chosen by them, not assigned by
    ///         the deployer. Empty until they actually propose/accept; the frontend
    ///         falls back to its own display copy until then.
    string public groomName;
    string public brideName;
    string public groomVow;
    string public brideVow;

    /// @notice One entry on the public guestbook.
    struct Tribute {
        address author;
        string name;
        string message;
        uint256 timestamp;
        bool hidden;
    }

    Tribute[] private _tributes;

    /// @notice Everything the frontend needs, in a single RPC call.
    struct Summary {
        Status status;
        uint256 marriedAt;
        address groom;
        address bride;
        address deployer;
        string groomName;
        string brideName;
        string groomVow;
        string brideVow;
    }

    event GroomSet(address indexed groom);
    event BrideSet(address indexed bride);
    event Proposal(address indexed groom, string name, string vow, uint256 timestamp);
    event MarriageCelebrated(
        address groom,
        address bride,
        string groomName,
        string brideName,
        uint256 timestamp,
        string groomVow,
        string brideVow
    );
    event TributeReceived(uint256 indexed id, address indexed author, string name, string message, uint256 timestamp);
    event TributeHidden(uint256 indexed id);

    error InvalidCouple();
    error NotGroom();
    error NotBride();
    error NotDeployer();
    error AlreadySet();
    error InvalidStatus();
    error MessageTooLong();
    error NameTooLong();
    error EmptyTribute();
    error TributeNotFound();

    constructor() {
        deployer = msg.sender;
    }

    /// @notice One-shot assignment of the groom's address. Only the deployer may call
    ///         this, and only before it's already set.
    function setGroom(address groom_) external {
        if (msg.sender != deployer) revert NotDeployer();
        if (groom != address(0)) revert AlreadySet();
        if (groom_ == address(0) || groom_ == bride) revert InvalidCouple();
        groom = groom_;
        emit GroomSet(groom_);
    }

    /// @notice One-shot assignment of the bride's address. Only the deployer may call
    ///         this, and only before it's already set.
    function setBride(address bride_) external {
        if (msg.sender != deployer) revert NotDeployer();
        if (bride != address(0)) revert AlreadySet();
        if (bride_ == address(0) || bride_ == groom) revert InvalidCouple();
        bride = bride_;
        emit BrideSet(bride_);
    }

    /// @notice The groom asks, signing with whatever name he chooses. Callable again
    ///         while still Proposed, so a typo in the name or the vow can be fixed
    ///         before she answers; locked forever once married.
    /// @dev While `groom` is still unset, `msg.sender` (never the zero address) can
    ///      never match it, so this correctly rejects everyone until setGroom runs.
    function propose(string calldata name, string calldata vow) external {
        if (msg.sender != groom) revert NotGroom();
        if (status == Status.Married) revert InvalidStatus();
        if (bytes(name).length > MAX_NAME_LENGTH) revert NameTooLong();
        _checkLength(vow);

        groomName = name;
        groomVow = vow;
        status = Status.Proposed;

        emit Proposal(msg.sender, name, vow, block.timestamp);
    }

    /// @notice The bride says yes, signing with whatever name she chooses. This is the
    ///         transaction the whole page waits for.
    function accept(string calldata name, string calldata vow) external {
        if (msg.sender != bride) revert NotBride();
        if (status != Status.Proposed) revert InvalidStatus();
        if (bytes(name).length > MAX_NAME_LENGTH) revert NameTooLong();
        _checkLength(vow);

        brideName = name;
        brideVow = vow;
        status = Status.Married;
        marriedAt = block.timestamp;

        emit MarriageCelebrated(groom, bride, groomName, name, block.timestamp, groomVow, vow);
    }

    /// @notice Leave a tribute on the public guestbook. Open to anyone, no access
    ///         control, before or after the wedding — that's the whole point.
    function sendTribute(string calldata name, string calldata message) external {
        if (bytes(message).length == 0) revert EmptyTribute();
        if (bytes(name).length > MAX_NAME_LENGTH) revert NameTooLong();
        _checkLength(message);

        _tributes.push(Tribute(msg.sender, name, message, block.timestamp, false));
        emit TributeReceived(_tributes.length - 1, msg.sender, name, message, block.timestamp);
    }

    /// @notice All tributes still visible, in the order they were sent.
    /// @dev A `public` array only auto-generates a getter for one index at a time, so
    ///      the array stays private behind this explicit view.
    function getTributes() external view returns (Tribute[] memory) {
        uint256 total = _tributes.length;
        uint256 visibleCount;
        for (uint256 i = 0; i < total; i++) {
            if (!_tributes[i].hidden) visibleCount++;
        }

        Tribute[] memory visible = new Tribute[](visibleCount);
        uint256 cursor;
        for (uint256 i = 0; i < total; i++) {
            if (!_tributes[i].hidden) {
                visible[cursor] = _tributes[i];
                cursor++;
            }
        }
        return visible;
    }

    /// @notice Total tributes ever sent, hidden ones included — the id space, not the
    ///         visible count.
    function getTributeCount() external view returns (uint256) {
        return _tributes.length;
    }

    /// @notice Soft-deletes an abusive or spam tribute. The only moderation possible
    ///         with no backend, given sendTribute has no access control.
    function hideTribute(uint256 id) external {
        if (msg.sender != deployer) revert NotDeployer();
        if (id >= _tributes.length) revert TributeNotFound();
        _tributes[id].hidden = true;
        emit TributeHidden(id);
    }

    /// @notice The whole ceremony state in one call, so the public RPC is hit once
    ///         per poll instead of several times.
    function summary() external view returns (Summary memory) {
        return
            Summary({
                status: status,
                marriedAt: marriedAt,
                groom: groom,
                bride: bride,
                deployer: deployer,
                groomName: groomName,
                brideName: brideName,
                groomVow: groomVow,
                brideVow: brideVow
            });
    }

    function _checkLength(string calldata text) private pure {
        if (bytes(text).length > MAX_MESSAGE_LENGTH) revert MessageTooLong();
    }
}
