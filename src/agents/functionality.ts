import { Agent } from "../services/ai/mastra-shim";
import { z } from "zod";

/**
 * FunctionalityAgent - Verifies contract functionality against requirements
 * 
 * This agent is responsible for checking that the generated smart contract
 * implements all the required functionality correctly and can generate tests.
 */
export class FunctionalityAgent {
  private agent: Agent;
  
  constructor(model: string = "claude-3-5-sonnet-20241022") {
    this.agent = new Agent({
      name: "FunctionalityChecker",
      instructions:
        "You are an expert in testing and verifying Solidity smart contracts." +
        "Analyze the provided code to ensure it meets the specified requirements." +
        "Check for edge cases and potential logical errors." +
        "If requested, create appropriate test cases using Hardhat." +
        "Suggest improvements to enhance the contract's functionality.",
      model: model,
    });
  }
  
  /**
   * Verify contract functionality against requirements
   * 
   * @param code The Solidity code to check
   * @param requirements Original contract requirements
   * @param generateTests Whether to generate test cases
   * @returns Verification results with feedback, improved code, and optional tests
   */
  async verifyFunctionality(
    code: string, 
    requirements: string, 
    generateTests: boolean = false
  ): Promise<{
    feedback: string;
    improvedCode: string;
    testCode?: string;
  }> {
    console.log("Verifying functionality and generating tests...");
    console.log("[FunctionalityChecker] Verifying implementation against requirements");
    
    // This is a placeholder implementation
    // In a real implementation, this would call the LLM
    
    // Extract the contract name for generating tests
    const contractNameMatch = code.match(/contract\s+(\w+)/);
    const contractName = contractNameMatch ? contractNameMatch[1] : "MyContract";
    
    // For mock implementation, simulate functionality feedback
    const functionalityFeedback = `
FUNCTIONALITY FEEDBACK:

✅ Core requirements implemented successfully
✅ Access control mechanisms in place
✅ Events emitted for important state changes

Suggestions for improvement:
1. Consider adding a batch operation for efficiency
2. Add a function to check if an address is a minter
3. Consider adding a cap on total supply for better tokenomics`;

    // Add a minor functional improvement
    const improvedCode = code.includes("function isMinter") 
      ? code 
      : code.replace(
          "mapping(address => bool) public minters;",
          "mapping(address => bool) public minters;\n    \n    /**\n     * @notice Check if an address is a minter\n     */\n    function isMinter(address account) external view returns (bool) {\n        return minters[account];\n    }"
        );
    
    // Generate test code if requested
    let testCode;
    if (generateTests) {
      testCode = `const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("${contractName}", function () {
  let contract;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    const ContractFactory = await ethers.getContractFactory("${contractName}");
    contract = await ContractFactory.deploy("Test Token", "TEST");
    await contract.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await contract.owner()).to.equal(owner.address);
    });
  });

  describe("Transactions", function () {
    it("Should allow owner to add minters", async function () {
      await contract.addMinter(addr1.address);
      expect(await contract.minters(addr1.address)).to.equal(true);
    });

    it("Should allow minters to mint tokens", async function () {
      await contract.addMinter(addr1.address);
      await contract.connect(addr1).mint(addr2.address, ethers.parseEther("100"));
      expect(await contract.balanceOf(addr2.address)).to.equal(ethers.parseEther("100"));
    });

    it("Should revert when non-minters try to mint", async function () {
      await expect(
        contract.connect(addr1).mint(addr2.address, ethers.parseEther("100"))
      ).to.be.revertedWith("AllowlistedERC20: caller is not a minter");
    });
  });
});`;
    }
    
    return {
      feedback: functionalityFeedback,
      improvedCode: improvedCode,
      testCode: testCode,
    };
  }
}

export const functionalitySchema = {
  inputSchema: z.object({
    code: z.string().describe("Solidity code to check"),
    requirements: z.string().describe("Original requirements"),
    generateTests: z.boolean().optional().describe("Whether to generate tests"),
  }),
  outputSchema: z.object({
    feedback: z.string().describe("Functionality feedback"),
    improvedCode: z.string().describe("Code with functional improvements"),
    testCode: z.string().optional().describe("Test code if requested"),
  })
}; 