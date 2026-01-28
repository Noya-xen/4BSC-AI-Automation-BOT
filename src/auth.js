import { Wallet } from "ethers";

export async function sign_with_private_key(private_key, message) {
    const wallet = new Wallet(private_key);

    const signature = await wallet.signMessage(message);

    return {
        address: wallet.address,
        signature,
    };
}
