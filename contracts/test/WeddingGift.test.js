import { expect } from "chai";
import { network } from "hardhat";

const PENDING = 0n;
const PROPOSED = 1n;
const MARRIED = 2n;

const GROOM_VOW = "Eu escolho voce, hoje e todos os dias.";
const BRIDE_VOW = "Sim, mil vezes sim.";
const DEDICATION = "Que este seja o primeiro de muitos comecos.";

describe("WeddingGift", function () {
  let ethers;
  let contract;
  let groom, bride, guest, stranger;

  before(async function () {
    ({ ethers } = await network.getOrCreate("default"));
  });

  beforeEach(async function () {
    [groom, bride, guest, stranger] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("WeddingGift");
    contract = await factory.deploy(groom.address, bride.address);
    await contract.waitForDeployment();
  });

  describe("deployment", function () {
    it("stores the couple addresses as immutables", async function () {
      expect(await contract.groom()).to.equal(groom.address);
      expect(await contract.bride()).to.equal(bride.address);
    });

    it("starts in the Pending status with an empty balance", async function () {
      expect(await contract.status()).to.equal(PENDING);
      expect(await contract.getBalance()).to.equal(0n);
      expect(await contract.marriedAt()).to.equal(0n);
    });

    it("rejects a zero address for either side of the couple", async function () {
      const factory = await ethers.getContractFactory("WeddingGift");
      await expect(
        factory.deploy(ethers.ZeroAddress, bride.address),
      ).to.be.revertedWithCustomError(contract, "InvalidCouple");
      await expect(
        factory.deploy(groom.address, ethers.ZeroAddress),
      ).to.be.revertedWithCustomError(contract, "InvalidCouple");
    });

    it("rejects the same address on both sides", async function () {
      const factory = await ethers.getContractFactory("WeddingGift");
      await expect(
        factory.deploy(groom.address, groom.address),
      ).to.be.revertedWithCustomError(contract, "InvalidCouple");
    });
  });

  describe("propose", function () {
    it("lets the groom propose and records the vow", async function () {
      await contract.connect(groom).propose(GROOM_VOW);
      expect(await contract.status()).to.equal(PROPOSED);
      expect(await contract.groomVow()).to.equal(GROOM_VOW);
    });

    it("emits Proposal with the groom and the vow", async function () {
      await expect(contract.connect(groom).propose(GROOM_VOW))
        .to.emit(contract, "Proposal")
        .withArgs(groom.address, GROOM_VOW, (t) => t > 0n);
    });

    it("rejects the bride and any stranger", async function () {
      await expect(
        contract.connect(bride).propose(GROOM_VOW),
      ).to.be.revertedWithCustomError(contract, "NotGroom");
      await expect(
        contract.connect(stranger).propose(GROOM_VOW),
      ).to.be.revertedWithCustomError(contract, "NotGroom");
    });

    it("allows re-proposing to fix the vow while still Proposed", async function () {
      await contract.connect(groom).propose("typo");
      await contract.connect(groom).propose(GROOM_VOW);
      expect(await contract.groomVow()).to.equal(GROOM_VOW);
      expect(await contract.status()).to.equal(PROPOSED);
    });

    it("is locked forever once married", async function () {
      await contract.connect(groom).propose(GROOM_VOW);
      await contract.connect(bride).accept(BRIDE_VOW);
      await expect(
        contract.connect(groom).propose("mudei de ideia"),
      ).to.be.revertedWithCustomError(contract, "InvalidStatus");
    });

    it("rejects a vow longer than the limit", async function () {
      const tooLong = "a".repeat(281);
      await expect(
        contract.connect(groom).propose(tooLong),
      ).to.be.revertedWithCustomError(contract, "MessageTooLong");
      await expect(contract.connect(groom).propose("a".repeat(280))).to.not.be.revert(ethers);
    });
  });

  describe("accept", function () {
    beforeEach(async function () {
      await contract.connect(groom).propose(GROOM_VOW);
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
    await expect(
      contract.connect(bride).accept(BRIDE_VOW),
    ).to.be.revertedWithCustomError(contract, "InvalidStatus");
  });

  describe("MarriageCelebrated event", function () {
    it("carries the couple, the total raised, both vows and the dedication", async function () {
      const gift = ethers.parseEther("1.5");
      await contract.connect(groom).depositGift(DEDICATION, { value: ethers.parseEther("0.5") });
      await contract.connect(guest).depositGift("", { value: ethers.parseEther("1.0") });
      await contract.connect(groom).propose(GROOM_VOW);

      await expect(contract.connect(bride).accept(BRIDE_VOW))
        .to.emit(contract, "MarriageCelebrated")
        .withArgs(
          groom.address,
          bride.address,
          (t) => t > 0n,
          gift,
          GROOM_VOW,
          BRIDE_VOW,
          DEDICATION,
        );
    });
  });

  describe("depositGift", function () {
    it("accepts a gift from any guest and adds it to the balance", async function () {
      await contract.connect(guest).depositGift("parabens!", {
        value: ethers.parseEther("0.25"),
      });
      await contract.connect(stranger).depositGift("", {
        value: ethers.parseEther("0.75"),
      });
      expect(await contract.getBalance()).to.equal(ethers.parseEther("1.0"));
    });

    it("emits GiftReceived with the sender, amount and message", async function () {
      await expect(
        contract.connect(guest).depositGift("felicidades", {
          value: ethers.parseEther("0.1"),
        }),
      )
        .to.emit(contract, "GiftReceived")
        .withArgs(guest.address, ethers.parseEther("0.1"), "felicidades", (t) => t > 0n);
    });

    it("rejects a zero-value gift", async function () {
      await expect(
        contract.connect(guest).depositGift("sem grana", { value: 0 }),
      ).to.be.revertedWithCustomError(contract, "EmptyGift");
    });

    it("records the dedication when the groom or the bride deposits", async function () {
      await contract.connect(groom).depositGift(DEDICATION, {
        value: ethers.parseEther("0.1"),
      });
      expect(await contract.dedication()).to.equal(DEDICATION);

      await contract.connect(bride).depositGift("da noiva", {
        value: ethers.parseEther("0.1"),
      });
      expect(await contract.dedication()).to.equal("da noiva");
    });

    it("does not let a guest overwrite the dedication", async function () {
      await contract.connect(groom).depositGift(DEDICATION, {
        value: ethers.parseEther("0.1"),
      });
      await contract.connect(guest).depositGift("recado do padrinho", {
        value: ethers.parseEther("0.1"),
      });
      expect(await contract.dedication()).to.equal(DEDICATION);
    });

    it("keeps an empty message from clearing an existing dedication", async function () {
      await contract.connect(groom).depositGift(DEDICATION, {
        value: ethers.parseEther("0.1"),
      });
      await contract.connect(groom).depositGift("", {
        value: ethers.parseEther("0.1"),
      });
      expect(await contract.dedication()).to.equal(DEDICATION);
    });

    it("works before, during and after the wedding", async function () {
      await contract.connect(guest).depositGift("", { value: ethers.parseEther("0.1") });
      await contract.connect(groom).propose(GROOM_VOW);
      await contract.connect(guest).depositGift("", { value: ethers.parseEther("0.1") });
      await contract.connect(bride).accept(BRIDE_VOW);
      await contract.connect(guest).depositGift("", { value: ethers.parseEther("0.1") });
      expect(await contract.getBalance()).to.equal(ethers.parseEther("0.3"));
    });

    it("rejects a message longer than the limit", async function () {
      await expect(
        contract.connect(guest).depositGift("a".repeat(281), { value: 1n }),
      ).to.be.revertedWithCustomError(contract, "MessageTooLong");
    });

    it("accepts a plain ETH transfer through receive()", async function () {
      await expect(
        guest.sendTransaction({
          to: await contract.getAddress(),
          value: ethers.parseEther("0.4"),
        }),
      )
        .to.emit(contract, "GiftReceived")
        .withArgs(guest.address, ethers.parseEther("0.4"), "", (t) => t > 0n);
      expect(await contract.getBalance()).to.equal(ethers.parseEther("0.4"));
    });
  });

  describe("withdrawGift", function () {


    beforeEach(async function () {
      await contract.connect(guest).depositGift("", {
        value: ethers.parseEther("2.0"),
      });
    });

    it("reverts before the wedding happens", async function () {
      await expect(
        contract.connect(groom).withdrawGift(),
      ).to.be.revertedWithCustomError(contract, "InvalidStatus");

      await contract.connect(groom).propose(GROOM_VOW);
      await expect(
        contract.connect(bride).withdrawGift(),
      ).to.be.revertedWithCustomError(contract, "InvalidStatus");
    });

    describe("once married", function () {
      beforeEach(async function () {
        await contract.connect(groom).propose(GROOM_VOW);
        await contract.connect(bride).accept(BRIDE_VOW);
      });

      it("sends the whole balance to the groom when he calls it", async function () {
        await expect(contract.connect(groom).withdrawGift()).to.changeEtherBalances(
        ethers,
          [groom, contract],
          [ethers.parseEther("2.0"), -ethers.parseEther("2.0")],
        );
        expect(await contract.getBalance()).to.equal(0n);
      });

      it("sends the whole balance to the bride when she calls it", async function () {
        await expect(contract.connect(bride).withdrawGift()).to.changeEtherBalances(
        ethers,
          [bride, contract],
          [ethers.parseEther("2.0"), -ethers.parseEther("2.0")],
        );
      });

      it("emits GiftWithdrawn", async function () {
        await expect(contract.connect(bride).withdrawGift())
          .to.emit(contract, "GiftWithdrawn")
          .withArgs(bride.address, ethers.parseEther("2.0"), (t) => t > 0n);
      });

      it("rejects anyone outside the couple", async function () {
        await expect(
          contract.connect(stranger).withdrawGift(),
        ).to.be.revertedWithCustomError(contract, "NotCouple");
      });

      it("reverts on a second withdrawal with nothing left", async function () {
        await contract.connect(groom).withdrawGift();
        await expect(
          contract.connect(bride).withdrawGift(),
        ).to.be.revertedWithCustomError(contract, "NothingToWithdraw");
      });

      it("can be called again after new gifts arrive", async function () {
        await contract.connect(groom).withdrawGift();
        await contract.connect(guest).depositGift("", {
          value: ethers.parseEther("0.5"),
        });
        await expect(contract.connect(bride).withdrawGift()).to.changeEtherBalance(
          ethers,
          bride,
          ethers.parseEther("0.5"),
        );
      });
    });
  });

  describe("summary", function () {
    it("reflects the pending state", async function () {
      const s = await contract.summary();
      expect(s.status).to.equal(PENDING);
      expect(s.balance).to.equal(0n);
      expect(s.groom).to.equal(groom.address);
      expect(s.bride).to.equal(bride.address);
      expect(s.groomVow).to.equal("");
      expect(s.brideVow).to.equal("");
      expect(s.dedication).to.equal("");
    });

    it("reflects the married state with balance and texts", async function () {
      await contract.connect(groom).depositGift(DEDICATION, {
        value: ethers.parseEther("1.0"),
      });
      await contract.connect(groom).propose(GROOM_VOW);
      await contract.connect(bride).accept(BRIDE_VOW);

      const s = await contract.summary();
      expect(s.status).to.equal(MARRIED);
      expect(s.balance).to.equal(ethers.parseEther("1.0"));
      expect(s.marriedAt).to.be.greaterThan(0n);
      expect(s.groomVow).to.equal(GROOM_VOW);
      expect(s.brideVow).to.equal(BRIDE_VOW);
      expect(s.dedication).to.equal(DEDICATION);
    });
  });
});
