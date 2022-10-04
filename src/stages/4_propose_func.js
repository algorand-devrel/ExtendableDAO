import { useState } from "react";
import StageCard from "../components/StageCard";
import { CardActions, CardContent, Typography, Step, Stepper, StepLabel } from "@mui/material";
import { LoadingButton } from '@mui/lab';
import { useQuery } from "@tanstack/react-query";
import { AtomicTransactionComposer, makeBasicAccountTransactionSigner, makeApplicationCreateTxnFromObject } from "algosdk";
import approvalProgram from '../contracts/optin_approval.teal'
import clearstateProgram from '../contracts/optin_clearstate.teal'
import { compileProgram } from "../utils/helpers";

export default function ProposeFunctionality({app, setApp, algod, contract, wallets}){

	const [step, setStep] = useState(-1)

	const { isFetching, isError, refetch } = useQuery(['4', 'propose_func'], async () => {

			setStep(0)
			const approval = await compileProgram(algod, approvalProgram)
			const clearstate = await compileProgram(algod, clearstateProgram)

			setStep(1)

			const sp = await algod.getTransactionParams().do()
			const composer = new AtomicTransactionComposer()
			composer.addMethodCall({
				appID: app.data.appID,
				method: contract.getMethodByName("propose"),
				methodArgs: [{
					txn: makeApplicationCreateTxnFromObject({
						from: app.data.owner,
						approvalProgram: approval,
						clearProgram: clearstate,
						numGlobalByteSlices: 8,
						numGlobalInts: 8,
						numLocalByteSlices: 4,
						numLocalInts: 4,
						suggestedParams: sp,
					}),
					signer: makeBasicAccountTransactionSigner(wallets[0])
				}],
				suggestedParams: sp,
				sender: app.data.owner,
				signer: makeBasicAccountTransactionSigner(wallets[0])
			})
			setStep(2)
			const response = await composer.execute(algod, 2);
			
			setStep(3)
			return parseInt(response.methodResults[0].returnValue)
	}, {
		onSuccess: (appID) => {
			setApp(prev => ({
				stage: 5,
				data: {
					...prev.data,
					proposalApp: appID
				}
			}))
		}
	})

	return(
		<StageCard currStage={app.stage} triggerStage={4} title="Propose Functionality" error={isError}>
			<CardContent>
				<Stepper activeStep={step} orientation="vertical">
					<Step><StepLabel>Compile Functionality Contracts</StepLabel></Step>
					<Step><StepLabel>Create Contract Deploy Txn</StepLabel></Step>
					<Step><StepLabel>Propose Functionality Contracts</StepLabel></Step>
				</Stepper>
				<Typography mt={1}>Proposal App ID: {'proposalApp' in app.data ? app.data.proposalApp : 'Not Deployed'}</Typography>
			</CardContent>
			<CardActions>
				<LoadingButton variant="contained" onClick={() => refetch()} loading={isFetching} disabled={app.stage !== 4}>Propose Functionality</LoadingButton>
			</CardActions>
		</StageCard>
	)
}