import { send_contract_tx } from "./contract.js";
import { CONTRACT_ABI } from "./ABI.js";
import dotenv from 'dotenv';
dotenv.config();


const CONTRACT_ADDRESS = "0xb3Ad998AF21485562eCd7eA700eF695135cbB491"; 
const RPC_URL = "https://bsc.meowrpc.com/";
const private_key = process.env.PRIVATE_KEY;


export async function contractCall(method, requestId, newRequest, description) {
    try {
        const argument = [requestId, newRequest];
        if (description) {
            argument.push(description);
        }

        const txResult = await send_contract_tx({
            rpc_url: RPC_URL,
            private_key,
            contract_address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            method,
            args: argument,
        });

        return txResult;
    } catch (error) {
        console.error(`Error calling ${method}:`, error);
        return null;
    }
}