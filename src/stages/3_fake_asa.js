import { useState } from "react";
import StageCard from "../components/StageCard";
import { CardActions, CardContent, Step, Stepper, StepLabel, Box, Divider, Chip } from "@mui/material";
import { LoadingButton } from '@mui/lab';
import { useQuery } from "@tanstack/react-query";
import { makeAssetCreateTxnWithSuggestedParamsFromObject, waitForConfirmation } from "algosdk";

export default function FakeASA({app, setApp, algod, wallets}){

	const [step, setStep] = useState(-1)

	const { isFetching, isError, refetch } = useQuery(['3', 'fake_asa'], async () => {

			setStep(0)
			let sp = await algod.getTransactionParams().do()
			const fakeusdcTxn = (await algod.sendRawTransaction(makeAssetCreateTxnWithSuggestedParamsFromObject({
				from: app.data.owner,
				assetName: 'Fake USDC',
				unitName: 'FUSDC',
				/* eslint-disable no-eval */
				total: 18446744073709551615n,
				decimals: 6,
				suggestedParams: sp
			}).signTxn(wallets[0].sk)).do())
			const fakeusdcID = (await waitForConfirmation(algod, fakeusdcTxn.txId, 4))["asset-index"];

			setStep(1)
			sp = await algod.getTransactionParams().do()
			const fakeusdtTxn = (await algod.sendRawTransaction(makeAssetCreateTxnWithSuggestedParamsFromObject({
				from: app.data.owner,
				assetName: 'Fake USDT',
				unitName: 'FUSDT',
				total: 18446744073709551615n,
				decimals: 6,
				suggestedParams: sp
			}).signTxn(wallets[0].sk)).do())
			const fakeusdtID = (await waitForConfirmation(algod, fakeusdtTxn.txId, 4))["asset-index"];

			setStep(2)
			return {asa1: fakeusdcID, asa2: fakeusdtID}
	}, {
		onSuccess: ({asa1, asa2}) => {
			setApp(prev => ({
				stage: 4,
				data: {
					...prev.data,
					asa1: asa1,
					asa2: asa2
				}
			}))
		}
	})

	return(
		<StageCard currStage={app.stage} triggerStage={3} title="Create Fake ASAs" error={isError}>
			<CardContent>
				<Box display="flex" justifyContent="space-between" mb={2}>
					<Chip label={('FUSDC ID: ' + ('asa1' in app.data ? app.data.asa1 : ''))} />
					<Divider orientation="vertical" flexItem />
					<Chip label={('FUSDT ID: ' + ('asa2' in app.data ? app.data.asa2 : ''))} />
				</Box>
				<Stepper activeStep={step} orientation="vertical">
					<Step><StepLabel>Create Fake USDC (FUSDC)</StepLabel></Step>
					<Step><StepLabel>Create Fake USDT (FUSDT)</StepLabel></Step>
				</Stepper>
			</CardContent>
			<CardActions>
				<LoadingButton variant="contained" onClick={() => refetch()} loading={isFetching} disabled={app.stage !== 3}>Create Fake ASAs</LoadingButton>
			</CardActions>
		</StageCard>
	)
}