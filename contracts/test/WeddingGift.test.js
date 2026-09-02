import { expect } from "chai";
import { network } from "hardhat";

const PENDING = 0n;
const PROPOSED = 1n;
const MARRIED = 2n;

const GROOM_VOW = "Eu escolho voce, hoje e todos os dias.";
const BRIDE_VOW = "Sim, mil vezes sim.";
const TRIBUTE_NAME = "Padrinho Lucas";
const TRIBUTE_MESSAGE = "Que este seja o primeiro de muitos comecos.";

describe("WeddingGift", function () {
  let ethers;
  let contract;
  // `deployer` is deliberately its own signer, never the groom or the bride: in
  // practice this is the friend publishing the contract, who assigns groom/bride
  // once he learns their addresses (they log in later, on their own).
  let deployer, groom, bride, guest, stranger;

  before(async function () {
    ({ ethers } = await network.getOrCreate("default"));
  });

  beforeEach(async function () {
    [deployer, groom, bride, guest, stranger] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("WeddingGift");
    contract = await factory.connect(deployer).deploy();
    await contract.waitForDeployment();
  });

  async function setCouple() {
    await contract.connect(deployer).setGroom(groom.address);
    await contract.connect(deployer).setBride(bride.address);
  }

  describe("deployment", function () {
    it("records whoever sent the deployment transaction", async function () {
      expect(await contract.deployer()).to.equal(deployer.address);
    });

    it("starts with groom and bride unset", async function () {
      expect(await contract.groom()).to.equal(ethers.ZeroAddress);
      expect(await contract.bride()).to.equal(ethers.ZeroAddress);
    });

    it("starts in the Pending status", async function () {
      expect(await contract.status()).to.equal(PENDING);
      expect(await contract.marriedAt()).to.equal(0n);
    });
  });

  describe("setGroom", function () {
    it("lets the deployer assign the groom once", async function () {
      await contract.connect(deployer).setGroom(groom.address);
      expect(await contract.groom()).to.equal(groom.address);
    });

    it("emits GroomSet", async function () {
      await expect(contract.connect(deployer).setGroom(groom.address))
        .to.emit(contract, "GroomSet")
        .withArgs(groom.address);
    });

    it("rejects anyone but the deployer", async function () {
      await expect(
        contract.connect(groom).setGroom(groom.address),
      ).to.be.revertedWithCustomError(contract, "NotDeployer");
      await expect(
        contract.connect(stranger).setGroom(groom.address),
      ).to.be.revertedWithCustomError(contract, "NotDeployer");
    });

    it("cannot be set twice", async function () {
      await contract.connect(deployer).setGroom(groom.address);
      await expect(
        contract.connect(deployer).setGroom(stranger.address),
      ).to.be.revertedWithCustomError(contract, "AlreadySet");
    });

    it("rejects the zero address", async function () {
      await expect(
        contract.connect(deployer).setGroom(ethers.ZeroAddress),
      ).to.be.revertedWithCustomError(contract, "InvalidCouple");
    });

    it("rejects an address already set as the bride", async function () {
      await contract.connect(deployer).setBride(bride.address);
      await expect(
        contract.connect(deployer).setGroom(bride.address),
      ).to.be.revertedWithCustomError(contract, "InvalidCouple");
    });
  });

  describe("setBride", function () {
    it("lets the deployer assign the bride once", async function () {
      await contract.connect(deployer).setBride(bride.address);
      expect(await contract.bride()).to.equal(bride.address);
    });

    it("emits BrideSet", async function () {
      await expect(contract.connect(deployer).setBride(bride.address))
        .to.emit(contract, "BrideSet")
        .withArgs(bride.address);
    });

    it("rejects anyone but the deployer", async function () {
      await expect(
        contract.connect(bride).setBride(bride.address),
      ).to.be.revertedWithCustomError(contract, "NotDeployer");
    });

    it("cannot be set twice", async function () {
      await contract.connect(deployer).setBride(bride.address);
      await expect(
        contract.connect(deployer).setBride(stranger.address),
      ).to.be.revertedWithCustomError(contract, "AlreadySet");
    });

    it("rejects the zero address", async function () {
      await expect(
        contract.connect(deployer).setBride(ethers.ZeroAddress),
      ).to.be.revertedWithCustomError(contract, "InvalidCouple");
    });

    it("rejects an address already set as the groom", async function () {
      await contract.connect(deployer).setGroom(groom.address);
      await expect(
        contract.connect(deployer).setBride(groom.address),
      ).to.be.revertedWithCustomError(contract, "InvalidCouple");
    });
  });

  describe("propose", function () {
    it("rejects everyone while the groom is still unset", async function () {
      await expect(
        contract.connect(groom).propose(GROOM_VOW),
      ).to.be.revertedWithCustomError(contract, "NotGroom");
    });

    it("lets the groom propose and records the vow", async function () {
      await setCouple();
      await contract.connect(groom).propose(GROOM_VOW);
      expect(await contract.status()).to.equal(PROPOSED);
      expect(await contract.groomVow()).to.equal(GROOM_VOW);
    });

    it("emits Proposal with the groom and the vow", async function () {
      await setCouple();
      await expect(contract.connect(groom).propose(GROOM_VOW))
        .to.emit(contract, "Proposal")
        .withArgs(groom.address, GROOM_VOW, (t) => t > 0n);
    });

    it("rejects the bride and any stranger", async function () {
      await setCouple();
      await expect(
        contract.connect(bride).propose(GROOM_VOW),
      ).to.be.revertedWithCustomError(contract, "NotGroom");
      await expect(
        contract.connect(stranger).propose(GROOM_VOW),
      ).to.be.revertedWithCustomError(contract, "NotGroom");
    });

    it("allows re-proposing to fix the vow while still Proposed", async function () {
      await setCouple();
      await contract.connect(groom).propose("typo");
      await contract.connect(groom).propose(GROOM_VOW);
      expect(await contract.groomVow()).to.equal(GROOM_VOW);
      expect(await contract.status()).to.equal(PROPOSED);
    });

    it("is locked forever once married", async function () {
      await setCouple();
      await contract.connect(groom).propose(GROOM_VOW);
      await contract.connect(bride).accept(BRIDE_VOW);
      await expect(
        contract.connect(groom).propose("mudei de ideia"),
      ).to.be.revertedWithCustomError(contract, "InvalidStatus");
    });

    it("rejects a vow longer than the limit", async function () {
      await setCouple();
      const tooLong = "a".repeat(281);
      await expect(
        contract.connect(groom).propose(tooLong),
      ).to.be.revertedWithCustomError(contract, "MessageTooLong");
      await expect(contract.connect(groom).propose("a".repeat(280))).to.not.be.revert(ethers);
    });
  });

  describe("accept", function () {
    beforeEach(async function () {
      await setCouple();
      await contract.connect(groom).propose(GROOM_VOW);
    });

    it("rejects everyone while the bride is still unset", async function () {
      // Redeploy fresh: this contract's setup already assigned the bride.
      const factory = await ethers.getContractFactory("WeddingGift");
      const fresh = await factory.connect(deployer).deploy();
      await fresh.connect(deployer).setGroom(groom.address);
      await fresh.connect(groom).propose(GROOM_VOW);
      await expect(
        fresh.connect(bride).accept(BRIDE_VOW),
      ).to.be.revertedWithCustomError(fresh, "NotBride");
    });

    it("marries the couple and records the vow and timestamp", async function () {
      await contract.connect(bride).accept(BRIDE_VOW);
      expect(await contract.status()).to.equal(MARRIED);
      expect(await contract.brideVow()).to.equal(BRIDE_VOW);
      expect(await contract.marriedAt()).to.be.greaterThan(0n);
    });

    it("rejects the groom and any stranger", async function () {
      await expect(
        contract.connect(groom).accept(BRIDE_VOW),
      ).to.be.revertedWithCustomError(contract, "NotBride");
      await expect(
        contract.connect(stranger).accept(BRIDE_VOW),
      ).to.be.revertedWithCustomError(contract, "NotBride");
    });

    it("cannot be called twice", async function () {
      await contract.connect(bride).accept(BRIDE_VOW);
      await expect(
        contract.connect(bride).accept(BRIDE_VOW),
      ).to.be.revertedWithCustomError(contract, "InvalidStatus");
    });

    it("rejects a vow longer than the limit", async function () {
      await expect(
        contract.connect(bride).accept("a".repeat(281)),
      ).to.be.revertedWithCustomError(contract, "MessageTooLong");
    });
  });

  it("cannot accept before a proposal exists", async function () {
    await setCouple();
    await expect(
      contract.connect(bride).accept(BRIDE_VOW),
    ).to.be.revertedWithCustomError(contract, "InvalidStatus");
  });

  describe("MarriageCelebrated event", function () {
    it("carries the couple, the timestamp and both vows", async function () {
      await setCouple();
      await contract.connect(groom).propose(GROOM_VOW);

      await expect(contract.connect(bride).accept(BRIDE_VOW))
        .to.emit(contract, "MarriageCelebrated")
        .withArgs(groom.address, bride.address, (t) => t > 0n, GROOM_VOW, BRIDE_VOW);
    });
  });

  describe("sendTribute", function () {
    it("lets anyone send a tribute, groom/bride/deployer included", async function () {
      await contract.connect(guest).sendTribute(TRIBUTE_NAME, TRIBUTE_MESSAGE);
      await contract.connect(stranger).sendTribute("Anonimo", "Felicidades!");
      await contract.connect(deployer).sendTribute("Padrinho", "Com carinho.");
      expect(await contract.getTributeCount()).to.equal(3n);
    });

    it("emits TributeReceived with the id, author, name and message", async function () {
      await expect(contract.connect(guest).sendTribute(TRIBUTE_NAME, TRIBUTE_MESSAGE))
        .to.emit(contract, "TributeReceived")
        .withArgs(0n, guest.address, TRIBUTE_NAME, TRIBUTE_MESSAGE, (t) => t > 0n);
    });

    it("stores tributes retrievable via getTributes, in insertion order", async function () {
      await contract.connect(guest).sendTribute("Primeiro", "Um");
      await contract.connect(stranger).sendTribute("Segundo", "Dois");

      const tributes = await contract.getTributes();
      expect(tributes).to.have.lengthOf(2);
      expect(tributes[0].name).to.equal("Primeiro");
      expect(tributes[0].author).to.equal(guest.address);
      expect(tributes[1].name).to.equal("Segundo");
      expect(tributes[1].author).to.equal(stranger.address);
    });

    it("rejects an empty message", async function () {
      await expect(
        contract.connect(guest).sendTribute(TRIBUTE_NAME, ""),
      ).to.be.revertedWithCustomError(contract, "EmptyTribute");
    });

    it("rejects a name longer than the limit", async function () {
      await expect(
        contract.connect(guest).sendTribute("a".repeat(65), TRIBUTE_MESSAGE),
      ).to.be.revertedWithCustomError(contract, "NameTooLong");
      await expect(
        contract.connect(guest).sendTribute("a".repeat(64), TRIBUTE_MESSAGE),
      ).to.not.be.revert(ethers);
    });

    it("rejects a message longer than the limit", async function () {
      await expect(
        contract.connect(guest).sendTribute(TRIBUTE_NAME, "a".repeat(281)),
      ).to.be.revertedWithCustomError(contract, "MessageTooLong");
    });

    it("works before, during and after the wedding", async function () {
      await contract.connect(guest).sendTribute("A", "antes");
      await setCouple();
      await contract.connect(groom).propose(GROOM_VOW);
      await contract.connect(guest).sendTribute("B", "durante");
      await contract.connect(bride).accept(BRIDE_VOW);
      await contract.connect(guest).sendTribute("C", "depois");
      expect(await contract.getTributeCount()).to.equal(3n);
    });
  });

  describe("hideTribute", function () {
    beforeEach(async function () {
      await contract.connect(guest).sendTribute(TRIBUTE_NAME, TRIBUTE_MESSAGE);
      await contract.connect(stranger).sendTribute("Segundo", "Outro recado");
    });

    it("removes a tribute from getTributes but not from the count", async function () {
      await contract.connect(deployer).hideTribute(0);
      const tributes = await contract.getTributes();
      expect(tributes).to.have.lengthOf(1);
      expect(tributes[0].name).to.equal("Segundo");
      expect(await contract.getTributeCount()).to.equal(2n);
    });

    it("emits TributeHidden", async function () {
      await expect(contract.connect(deployer).hideTribute(0))
        .to.emit(contract, "TributeHidden")
        .withArgs(0n);
    });

    it("rejects anyone but the deployer", async function () {
      await expect(
        contract.connect(guest).hideTribute(0),
      ).to.be.revertedWithCustomError(contract, "NotDeployer");
    });

    it("rejects an out-of-range id", async function () {
      await expect(
        contract.connect(deployer).hideTribute(99),
      ).to.be.revertedWithCustomError(contract, "TributeNotFound");
    });
  });

  describe("summary", function () {
    it("reflects the pending state", async function () {
      const s = await contract.summary();
      expect(s.status).to.equal(PENDING);
      expect(s.groom).to.equal(ethers.ZeroAddress);
      expect(s.bride).to.equal(ethers.ZeroAddress);
      expect(s.deployer).to.equal(deployer.address);
      expect(s.groomVow).to.equal("");
      expect(s.brideVow).to.equal("");
    });

    it("reflects the married state with both vows", async function () {
      await setCouple();
      await contract.connect(groom).propose(GROOM_VOW);
      await contract.connect(bride).accept(BRIDE_VOW);

      const s = await contract.summary();
      expect(s.status).to.equal(MARRIED);
      expect(s.groom).to.equal(groom.address);
      expect(s.bride).to.equal(bride.address);
      expect(s.marriedAt).to.be.greaterThan(0n);
      expect(s.groomVow).to.equal(GROOM_VOW);
      expect(s.brideVow).to.equal(BRIDE_VOW);
    });
  });
});
