import { useState } from "react";
import StageCard from "../components/StageCard";
import { CardActions, CardContent, Step, Stepper, StepLabel } from "@mui/material";
import { LoadingButton } from '@mui/lab';
import { useQuery } from "@tanstack/react-query";
import { 
	AtomicTransactionComposer,
	makeAssetCreateTxnWithSuggestedParamsFromObject, 
	makeAssetTransferTxnWithSuggestedParamsFromObject, 
	makeBasicAccountTransactionSigner, 
	makePaymentTxnWithSuggestedParamsFromObject, 
	waitForConfirmation 
} from "algosdk";

export default function DAOToken({app, setApp, algod, wallets}){

	const [step, setStep] = useState(-1)
	const [tokenCount] = useState(20)

	const { isFetching, isError, refetch } = useQuery(['1', 'dao_token'], async () => {

			setStep(0)

			let sp = await algod.getTransactionParams().do()
			const daotokenTxn = (await algod.sendRawTransaction(makeAssetCreateTxnWithSuggestedParamsFromObject({
				from: app.data.owner,
				assetName: 'DAO Token',
				unitName: 'DT',
				total: 100,
				decimals: 0,
				suggestedParams: sp
			}).signTxn(wallets[0].sk)).do())

			const assetID = (await waitForConfirmation(algod, daotokenTxn.txId, 4))["asset-index"];

			setStep(1)

			const composer = new AtomicTransactionComposer()

			sp = await algod.getTransactionParams().do()

			// Opt In Transaction
			composer.addTransaction({
				txn: makeAssetTransferTxnWithSuggestedParamsFromObject({
					from: app.data.voter,
					to: app.data.voter,
					amount: 0,
					assetIndex: assetID,
					suggestedParams: sp
				}),
				signer: makeBasicAccountTransactionSigner(wallets[1])
			})

			// Send Voter Tokens Txn
			composer.addTransaction({
				txn: makeAssetTransferTxnWithSuggestedParamsFromObject({
					from: app.data.owner,
					to: app.data.voter,
					amount: tokenCount,
					assetIndex: assetID,
					suggestedParams: sp
				}),
				signer: makeBasicAccountTransactionSigner(wallets[0])
			})

			// Fund DAO Contract Txn
			composer.addTransaction({
				txn: makePaymentTxnWithSuggestedParamsFromObject({
					from: app.data.owner,
					to: app.data.appAddress,
					amount: 10000000,
					suggestedParams: sp
				}),
				signer: makeBasicAccountTransactionSigner(wallets[0])
			})

			await composer.execute(algod, 2)

			setStep(4)

			return assetID
	}, {
		onSuccess: (assetID) => {
			setApp(prev => ({
				stage: 2,
				data: {
					...prev.data,
					daotokenID: assetID,
					voterTokens: tokenCount
				}
			}))
		}
	})

	return(
		<StageCard currStage={app.stage} triggerStage={1} title="Create DAO Token" error={isError}>
			<CardContent>
				<Stepper activeStep={step} orientation="vertical">
					<Step><StepLabel>Create DAO Token</StepLabel></Step>
					<Step><StepLabel>Opt-In Voter Address to Token</StepLabel></Step>
					<Step><StepLabel>Send Voter Address {tokenCount} Tokens</StepLabel></Step>
					<Step><StepLabel>Fund DAO Contract w/ 10 Algos</StepLabel></Step>
				</Stepper>
			</CardContent>
			<CardActions>
				<LoadingButton variant="contained" onClick={() => refetch()} loading={isFetching} disabled={app.stage !== 1}>Create DAO Token</LoadingButton>
			</CardActions>
		</StageCard>
	)
}