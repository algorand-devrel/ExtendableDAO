import { useState, useEffect } from "react";
import StageCard from "../components/StageCard";
import { Step, Stepper, StepLabel, CardContent, StepContent } from "@mui/material";
import { LoadingButton } from '@mui/lab';
import { useQuery } from "@tanstack/react-query";
import { AtomicTransactionComposer, makeBasicAccountTransactionSigner, OnApplicationComplete } from "algosdk";

export default function Proposal({app, setApp, algod, contract, wallets}){

	const [step, setStep] = useState(-1)
	useEffect(() => { if(app.stage === 6 && step === -1) setStep(0) }, [app, step])

	const { isFetching, isError, refetch } = useQuery(['6', 'proposal'], async () => {
			let sp = await algod.getTransactionParams().do()
			const composer = new AtomicTransactionComposer()
			const owner = makeBasicAccountTransactionSigner(wallets[0])

			// activate
			if(step === 0){
				sp.fee = 2000
				composer.addMethodCall({
					appID: app.data.appID,
					method: contract.getMethodByName("activate"),
					methodArgs: [app.data.proposalApp],
					sender: app.data.owner,
					signer: owner,
					suggestedParams: sp
				})
				const response = await composer.execute(algod, 2);
				return parseInt(response.methodResults[0].returnValue)
			}
			
			// delete
			if(step === 1){
				composer.addMethodCall({
					appID: app.data.proposalApp,
					method: contract.getMethodByName("deactivate"),
					onComplete: OnApplicationComplete.DeleteApplicationOC,
					sender: app.data.owner,
					signer: owner,
					suggestedParams: sp
				})
				return await composer.execute(algod, 2)
			}

			// reclaim asa
			if(step === 2){
				sp.fee = 2000
				composer.addMethodCall({
					appID: app.data.appID,
					method: contract.getMethodByName("reclaim"),
					methodArgs: [app.data.proposalApp, app.data.daotokenID],
					sender: app.data.voter,
					signer: makeBasicAccountTransactionSigner(wallets[1]),
					suggestedParams: sp
				})

				return await composer.execute(algod, 2)
			}

	}, {
		onSuccess: (appID) => {
			if(step === 0){
				setApp(prev => ({
					stage: 6,
					data: {
						...prev.data,
						activatedAppID: appID
					}
				}))
			} else if(step === 2){
				setApp(prev => ({...prev, stage: 7}))
			}
			
			setStep(step + 1)
		}
	})

	return(
		<StageCard currStage={app.stage} triggerStage={6} title="Proposal" error={isError}>
			<CardContent>
				<Stepper activeStep={step} orientation="vertical">
					<Step>
						<StepLabel>Activate Proposal</StepLabel>
						<StepContent>
							<LoadingButton variant="contained" onClick={() => refetch()} loading={isFetching} disabled={app.stage !== 6 || step !== 0}>Activate</LoadingButton>
						</StepContent>
					</Step>
					<Step>
						<StepLabel>Delete Proposal</StepLabel>
						<StepContent>
							<LoadingButton variant="contained" onClick={() => refetch()} loading={isFetching} disabled={app.stage !== 6 || step !== 1}>Delete</LoadingButton>
						</StepContent>
					</Step>
					<Step>
						<StepLabel>Reclaim DAO Tokens</StepLabel>
						<StepContent>
							<LoadingButton variant="contained" onClick={() => refetch()} loading={isFetching} disabled={app.stage !== 6 || step !== 2}>Reclaim</LoadingButton>
						</StepContent>
					</Step>
				</Stepper>
			</CardContent>
		</StageCard>
	)
}