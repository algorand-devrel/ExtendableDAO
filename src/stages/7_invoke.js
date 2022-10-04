import { useState } from "react";
import StageCard from "../components/StageCard";
import { CardActions } from "@mui/material";
import { LoadingButton } from '@mui/lab';
import { useQuery } from "@tanstack/react-query";
import { AtomicTransactionComposer, makeBasicAccountTransactionSigner, makeAssetTransferTxnWithSuggestedParamsFromObject } from "algosdk";
import { Box } from "@mui/system";

export default function Invoke({app, algod, contract, wallets}){

	const[asa1, setASA1] = useState(false)
	const[asa2, setASA2] = useState(false)

	const { isFetching: fetching_asa1, isError: error_asa1, refetch: invoke_asa1 } = useQuery(['7', 'invoke_asa1'], async () => {
		const sp = await algod.getTransactionParams().do()
		const composer = new AtomicTransactionComposer()
		const owner = makeBasicAccountTransactionSigner(wallets[0])
		
		if(!asa1){
			composer.addMethodCall({
				appID: app.data.appID,
				method: contract.getMethodByName("invoke"),
				methodArgs: [app.data.activatedAppID],
				sender: app.data.owner,
				signer: owner,
				suggestedParams: sp
			});
			// foreign Assets
			composer['transactions'][0]['txn']['appForeignAssets'][0] = app.data.asa1;
		} else {
			composer.addTransaction({
				txn: makeAssetTransferTxnWithSuggestedParamsFromObject({
					from: app.data.owner,
					to: app.data.appAddress,
					amount: 10000000,
					assetIndex: app.data.asa1,
					suggestedParams: sp
				}),
				signer: owner
			})
		}
		return await composer.execute(algod, 2)

	}, { onSuccess: () => setASA1(true) })

	const { isFetching: fetching_asa2, isError: error_asa2, refetch: invoke_asa2 } = useQuery(['7', 'invoke_asa2'], async () => {
		const sp = await algod.getTransactionParams().do()
		const composer = new AtomicTransactionComposer()
		const owner = makeBasicAccountTransactionSigner(wallets[0])
		
		if(!asa2){
			composer.addMethodCall({
				appID: app.data.appID,
				method: contract.getMethodByName("invoke"),
				methodArgs: [app.data.activatedAppID],
				sender: app.data.owner,
				signer: owner,
				suggestedParams: sp
			});
			// foreign Assets
			composer['transactions'][0]['txn']['appForeignAssets'][0] = app.data.asa2;
		} else {
			composer.addTransaction({
				txn: makeAssetTransferTxnWithSuggestedParamsFromObject({
					from: app.data.owner,
					to: app.data.appAddress,
					amount: 10000000,
					assetIndex: app.data.asa2,
					suggestedParams: sp
				}),
				signer: owner
			})
		}
		return await composer.execute(algod, 2)

	}, { onSuccess: () => setASA2(true) })

	return(
		<StageCard currStage={app.stage} triggerStage={7} title="Invoke" error={error_asa1 || error_asa2}>
			<CardActions sx={{flexDirection: 'column', gap: '1rem'}}>
				<Box display="flex" gap={2} mt={2}>
					{asa1 ? 
					<LoadingButton variant="contained" onClick={() => invoke_asa1()} loading={fetching_asa1}>Send 10 FUSDC</LoadingButton> : 
					<LoadingButton variant="contained" onClick={() => invoke_asa1()} loading={fetching_asa1}>Invoke FUSDC</LoadingButton>
					}
					{asa2 ? 
					<LoadingButton variant="contained" onClick={() => invoke_asa2()} loading={fetching_asa2}>Send 10 FUSDT</LoadingButton> : 
					<LoadingButton variant="contained" onClick={() => invoke_asa2()} loading={fetching_asa2}>Invoke FUSDT</LoadingButton>
					}
				</Box>
			</CardActions>
		</StageCard>
	)
}