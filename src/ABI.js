export const CONTRACT_ABI = [
    // addNewRequest
    {
        "inputs": [
            { "internalType": "uint256", "name": "requestId", "type": "uint256" },
            { "internalType": "string", "name": "newRequestInfo", "type": "string" }
        ],
        "name": "addNewRequest",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },

    // addNewAgent
    {
        "inputs": [
            { "internalType": "uint256", "name": "agentId", "type": "uint256" },
            { "internalType": "string", "name": "name", "type": "string" },
            { "internalType": "string", "name": "description", "type": "string" }
        ],
        "name": "addNewAgent",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];
