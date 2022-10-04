import { useQuery } from '@tanstack/react-query'
import {useSandboxData} from './useSandbox';
import {Kmd, encodeAddress} from 'algosdk';

export default function useWallets(enabled = false){

    const [sandbox] = useSandboxData()

    return useQuery(['wallets', sandbox], async () => {
		const kmd = new Kmd(sandbox.kmd_token, "http://localhost", sandbox.kmd_port)
		let walletHandle;
		const wallets = await kmd.listWallets()
		.then(res => kmd.initWalletHandle(res.wallets[0].id))
		.then(res => {
			walletHandle = res.wallet_handle_token
			return kmd.listKeys(walletHandle)
		}).then(async res => {

			const privateKeys =  await Promise.all(res.addresses.map(async address => await kmd.exportKey(walletHandle, "", address)))

			kmd.releaseWalletHandle(walletHandle)

			return privateKeys.map(key => ({sk: key.private_key, addr: encodeAddress(key.private_key.slice(32))}))
			
		}).catch(e => [])

		if(wallets.length === 0) throw new Error('No Wallets Found')
		return wallets
	},{
		enabled: enabled,
		retry: true,
	})
}