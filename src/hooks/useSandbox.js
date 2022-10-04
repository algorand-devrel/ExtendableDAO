import useLocalStorage from './useLocalStorage';
import { useQuery } from '@tanstack/react-query';

// Sandbox Connection Defaults
export const useSandboxData = () => useLocalStorage("sandbox", {
	algod_port: 4001,
	algod_token: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
	indexer_port: 8980,
	indexer_token: "",
	kmd_port: 4002,
	kmd_token: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
})


export function useSandboxActive(sandbox){

    return useQuery(['sandbox_conn', sandbox], async () => {
		const algod = await fetch('http://localhost:' + sandbox.algod_port + '/v2/status', { headers: { 'X-Algo-Api-Token': sandbox.algod_token }}).then(res => res.ok).catch(e => false)
		const indexer = await fetch('http://localhost:' + sandbox.indexer_port + '/v2/accounts', { headers: { 'X-Algo-Api-Token': sandbox.indexer_token }}).then(res => res.ok).catch(e => false)
		const kmd = await fetch('http://localhost:' + sandbox.kmd_port + '/v1/wallets', { headers: { 'X-KMD-API-Token': sandbox.kmd_token }}).then(res => res.ok).catch(e => false)

		return {algod: algod, indexer: indexer, kmd: kmd}
	}, {
		enabled: true,
		refetchInterval: 5000, // Poll Sandbox Every 5 seconds
		initialData: {
			algod: false,
			indexer: false,
			kmd: false
		},
		retry: true,
		staleTime: 5000,
		cacheTime: 5000
	})
}