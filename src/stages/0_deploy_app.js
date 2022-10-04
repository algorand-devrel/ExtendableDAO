import { useState } from "react";
import StageCard from "../components/StageCard";
import { CardActions, CardContent, Typography, TextField } from "@mui/material";
import { LoadingButton } from '@mui/lab';
import { useQuery } from "@tanstack/react-query";
import { AtomicTransactionComposer, makeBasicAccountTransactionSigner, getApplicationAddress } from "algosdk";
import approvalProgram from '../contracts/dao_approval.teal'
import clearstateProgram from '../contracts/dao_clearstate.teal'
import { compileProgram } from "../utils/helpers";

export default function DeployApp({app, setApp, algod, contract, wallets}){

	const [name, setName] = useState('')

	const { isFetching, isError, refetch } = useQuery(['0', 'deploy_app'], async () => {
			const composer = new AtomicTransactionComposer();
			const sp = await algod.getTransactionParams().do()
			
			const approval = await compileProgram(algod, approvalProgram)
			const clearstate = await compileProgram(algod, clearstateProgram)

			composer.addMethodCall({
				appID: 0,
				method: contract.getMethodByName("deploy"),
				numGlobalByteSlices: 0,
				numGlobalInts: 64,
				numLocalByteSlices: 0,
				numLocalInts: 16,
				approvalProgram: approval,
				clearProgram: clearstate,
				methodArgs: [name],
				suggestedParams: sp,
				signer: makeBasicAccountTransactionSigner(wallets[0]),
				sender: wallets[0].addr
			})

			return await composer.execute(algod, 2)
	}, {
		onSuccess: (response) => {
			const appID = response.methodResults[0].txInfo["application-index"] 
			setApp(prev => ({
				stage: 1,
				data: {
					...prev.data,
					owner: wallets[0].addr,
					appID: appID,
					appAddress: getApplicationAddress(appID),
					voter: wallets[1].addr
				}
			}))
		}
	})

	return(
		<StageCard currStage={app.stage} triggerStage={0} title="Deploy DAO" error={isError} sx={{width: '284px'}}>
			<CardContent>
				<Typography mb={1}>App ID: {'appID' in app.data ? app.data.appID : 'Not Deployed'}</Typography>
				<Typography noWrap mb={2}>App Address: {'appAddress' in app.data ? app.data.appAddress : 'Not Deployed'}</Typography>
				<TextField inputProps={{maxLength: 15}} label="Name of DAO" disabled={app.stage !== 0} value={name} onChange={(e) => setName(e.target.value)} />
			</CardContent>
			<CardActions>
				<LoadingButton variant="contained" onClick={() => refetch()} loading={isFetching} disabled={app.stage !== 0 || name === ''}>Deploy DAO</LoadingButton>
			</CardActions>
		</StageCard>
	)
}