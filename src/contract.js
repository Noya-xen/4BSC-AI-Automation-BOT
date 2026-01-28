import { JsonRpcProvider, Wallet, Contract } from "ethers";

export function get_signer({
    rpc_url,
    private_key,
}) {
    const provider = new JsonRpcProvider(rpc_url);
    const wallet = new Wallet(private_key, provider);
    return wallet;
}

/**
 * Send transaction to smart contract
 */
export async function send_contract_tx({
    rpc_url,
    private_key,
    contract_address,
    abi,
    method,
    args = [],
    value = 0n,
    gas_limit,
}) {
    try {
        const signer = get_signer({ rpc_url, private_key });

        const contract = new Contract(
            contract_address,
            abi,
            signer
        );

        const tx = await contract[method](...args, {
            value,
            gasLimit: gas_limit,
        });

        const receipt = await tx.wait();

        return {
            hash: tx.hash,
            status: receipt.status,
            blockNumber: receipt.blockNumber,
        };
    } catch (error) {
        console.error("send_contract_tx error:", error);
        throw error;
    }
}
