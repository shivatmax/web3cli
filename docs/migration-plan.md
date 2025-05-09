# Migration Plan for Web3CLI Restructuring

This document outlines the plan for migrating the current codebase to the new project structure.

## Migration Overview

The migration will be completed in phases to ensure a smooth transition and to maintain functionality throughout the process.

### Phase 1: Structural Changes

1. **Create directory structure**
   - Set up new folders based on the planned structure
   - Create placeholder files with module definitions

2. **Reorganize existing code**
   - Move current source files to appropriate directories
   - Update import paths
   - Ensure the build process works with the new structure

3. **Update build configuration**
   - Modify tsup.config.ts for the new file structure
   - Update package.json scripts if needed

### Phase 2: Code Refactoring

1. **Agent System**
   - Refactor agent-mode.ts into individual agent modules
   - Create coordinator agent to manage interactions
   - Improve API for agent interactions

2. **CLI Commands**
   - Refactor CLI commands into separate files
   - Implement command registration system
   - Ensure backward compatibility

3. **Services**
   - Refactor core services into dedicated modules
   - Create proper abstractions for AI, search, and contract generation
   - Implement configuration service

### Phase 3: Test and Documentation

1. **Testing**
   - Create unit tests for core functionality
   - Add integration tests for command workflows
   - Ensure test coverage for critical components

2. **Documentation**
   - Update user documentation
   - Add developer documentation for the new structure
   - Create API documentation

## File Migration Mapping

Below is a mapping of current files to their new locations:

| Current File | New Location |
|--------------|--------------|
| src/agent-mode.ts | src/agents/coordinator.ts + individual agent files |
| src/cli.ts | src/cli/index.ts |
| src/config.ts | src/services/config/config.ts |
| src/vector-db.ts | src/services/vector-db/vector-db.ts |
| src/search.ts | src/services/search/search.ts |
| src/generate-contract.ts | src/services/contract/generator.ts |
| src/explain-contract.ts | src/services/contract/explainer.ts |
| src/models.ts | src/services/ai/models.ts |
| src/ask.ts | src/cli/commands/ask.ts |
| src/tty.ts | src/utils/tty.ts |
| src/utils.ts | src/utils/index.ts |
| src/error.ts | src/utils/error.ts |
| src/mastra-shim.ts | src/services/ai/mastra-shim.ts |
| src/ai-sdk.ts | src/services/ai/client.ts |
| src/ai-command.ts | src/cli/ai-command.ts |

## Implementation Steps

### Step 1: Basic Structure

```bash
# Create directories
mkdir -p src/{agents,cli/commands,services/{ai,contract,search,vector-db,config},utils,types}
mkdir -p templates/{contracts,tests}
mkdir -p tests/{unit,integration,fixtures}
mkdir -p docs/{api,examples}
mkdir -p web
```

### Step 2: Move Files

For each file in the migration mapping, create the target directory and move the file:

```bash
# Example
mkdir -p src/services/config
cp src/config.ts src/services/config/config.ts
```

### Step 3: Update Imports

After moving files, update all import statements to reflect the new file paths.

### Step 4: Refactor Agents

Split the large agent-mode.ts file into individual agent modules.

### Step 5: Build and Test

Run build and tests to ensure everything works correctly after migration.

## Backward Compatibility

To maintain backward compatibility during the transition:

1. Use re-export files to maintain the old import paths
2. Create wrapper functions that call the new implementations
3. Add deprecation notices to old interfaces

## Rollback Plan

If issues arise during migration:

1. Revert to the previous directory structure
2. Restore original files from version control
3. Update the build configuration to use the original paths

## Timeline

- **Week 1**: Create directory structure and move files
- **Week 2**: Update import paths and ensure build process works
- **Week 3**: Refactor agent system and CLI commands
- **Week 4**: Refactor services and add tests
- **Week 5**: Update documentation and finalize migration 