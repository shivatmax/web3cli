/**
 * MetaMask Error Handling
 * 
 * This module provides utilities for handling MetaMask error codes
 * based on the EIP-1193 and JSON RPC 2.0 standards.
 * Reference: https://medium.com/@social_42205/recognising-and-fixing-problem-codes-in-metamask-ae851060a05c
 */

/**
 * MetaMask error code descriptions
 */
export const METAMASK_ERROR_CODES: Record<string, { standard: string, message: string, solution?: string }> = {
  // EIP-1193 errors
  '4001': {
    standard: 'EIP-1193',
    message: 'User rejected the request.',
    solution: 'The user canceled the request. Try providing more information about why the action is needed.'
  },
  '4100': {
    standard: 'EIP-1193',
    message: 'The requested account and/or method has not been authorized by the user.',
    solution: 'Request access to the user\'s accounts via wallet_requestPermissions first.'
  },
  '4200': {
    standard: 'EIP-1193',
    message: 'The requested method is not supported by this Ethereum provider.',
    solution: 'Check for typos in the method name or if the method exists in the current provider.'
  },
  '4900': {
    standard: 'EIP-1193',
    message: 'The provider is disconnected from all chains.',
    solution: 'The wallet is disconnected. Ask the user to check their internet connection and reload the page.'
  },
  '4901': {
    standard: 'EIP-1193',
    message: 'The provider is disconnected from the specified chain.',
    solution: 'User needs to connect to the correct chain. Suggest switching networks.'
  },
  
  // JSON-RPC 2.0 errors
  '-32700': {
    standard: 'JSON RPC 2.0',
    message: 'Invalid JSON was received by the server. An error occurred on the server while parsing the JSON text.',
    solution: 'Verify that your request object is valid JSON.'
  },
  '-32600': {
    standard: 'JSON RPC 2.0',
    message: 'The JSON sent is not a valid Request object.',
    solution: 'Check that your request object follows the JSON-RPC 2.0 spec.'
  },
  '-32601': {
    standard: 'JSON RPC 2.0',
    message: 'The method does not exist / is not available.',
    solution: 'Verify the method name is correct and supported by the current provider.'
  },
  '-32602': {
    standard: 'JSON RPC 2.0',
    message: 'Invalid method parameter(s).',
    solution: 'Check that the parameters you\'re passing match what the method expects.'
  },
  '-32603': {
    standard: 'JSON RPC 2.0',
    message: 'Internal JSON-RPC error.',
    solution: 'This is a general error. Check for: incorrect chain data, insufficient tokens for gas, or outdated MetaMask version.'
  },
  
  // EIP-1474 errors
  '-32000': {
    standard: 'EIP-1474',
    message: 'Invalid input.',
    solution: 'Check contract address, ABI, or other parameters for accuracy.'
  },
  '-32001': {
    standard: 'EIP-1474',
    message: 'Resource not found.',
    solution: 'The requested resource does not exist on the blockchain. Check for typos or non-existent entities.'
  },
  '-32002': {
    standard: 'EIP-1474',
    message: 'Resource unavailable.',
    solution: 'The resource exists but is currently unavailable. Avoid rapid successive requests like multiple chain switching.'
  },
  '-32003': {
    standard: 'EIP-1474',
    message: 'Transaction rejected.',
    solution: 'Check for: non-existent sender address, insufficient funds, locked account, or inability to sign the transaction.'
  },
  '-32004': {
    standard: 'EIP-1474',
    message: 'Method not supported.',
    solution: 'The method is not supported by the current provider. Check for typos or if the method exists.'
  },
  '-32005': {
    standard: 'EIP-1474',
    message: 'Request limit exceeded.',
    solution: 'You\'ve exceeded the rate limit. Implement exponential backoff or reduce request frequency.'
  }
};

/**
 * Get error information for a MetaMask error code
 * 
 * @param code Error code from MetaMask
 * @returns Error information object or undefined if not found
 */
export function getMetaMaskErrorInfo(code: string | number) {
  const codeStr = code.toString();
  return METAMASK_ERROR_CODES[codeStr];
}

/**
 * Handles a MetaMask error by providing useful information
 * 
 * @param error The error object from MetaMask
 * @returns Formatted error message with solution
 */
export function handleMetaMaskError(error: any): string {
  let code: string | undefined;
  
  // Extract error code from various error formats
  if (typeof error === 'object') {
    if (error.code !== undefined) {
      code = error.code.toString();
    } else if (error.error?.code !== undefined) {
      code = error.error.code.toString();
    } else if (error.message && error.message.includes('code')) {
      // Try to extract code from error message
      const codeMatch = error.message.match(/code[: ]([0-9\-]+)/i);
      if (codeMatch && codeMatch[1]) {
        code = codeMatch[1];
      }
    }
  }
  
  if (!code) {
    return `Unknown MetaMask error: ${error.message || JSON.stringify(error)}`;
  }
  
  const errorInfo = getMetaMaskErrorInfo(code);
  
  if (!errorInfo) {
    return `MetaMask error code ${code}: ${error.message || 'Unknown error'}`;
  }
  
  return `MetaMask error ${code} (${errorInfo.standard}): ${errorInfo.message}\n\nSolution: ${errorInfo.solution || 'No specific solution available.'}`;
}

/**
 * Augments a web3 function to handle MetaMask errors gracefully
 * 
 * @param fn The function to wrap with error handling
 * @returns Wrapped function with error handling
 */
export function withMetaMaskErrorHandling<T extends (...args: any[]) => Promise<any>>(fn: T): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return await fn(...args);
    } catch (error: any) {
      console.error(handleMetaMaskError(error));
      throw error;
    }
  }) as T;
} 