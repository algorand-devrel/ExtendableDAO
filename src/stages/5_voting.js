import { useState } from "react";
import StageCard from "../components/StageCard";
import { CardActions, CardContent, TextField, Typography, Box, Chip, Switch } from "@mui/material";
import { LoadingButton } from '@mui/lab';
import { useQuery } from "@tanstack/react-query";
import { 
	makeAssetTransferTxnWithSuggestedParamsFromObject, 
	AtomicTransactionComposer, 
	makeBasicAccountTransactionSigner, 
	OnApplicationComplete
} from "algosdk";
import { Stack } from "@mui/system";

export default function Voting({app, setApp, algod, contract, wallets}){
	const [amount, setAmount] = useState(1)
	const [vote, setVote] = useState(true)

	const { isSuccess, isFetching: vote_fetching, isError: vote_error, refetch } = useQuery(['5', 'vote'], async () => {
			const sp = await algod.getTransactionParams().do()
			const composer = new AtomicTransactionComposer()
			const signer = makeBasicAccountTransactionSigner(wallets[1])

			composer.addMethodCall({
				appID: app.data.appID,
				method: contract.getMethodByName("vote"),
				methodArgs: [
					app.data.proposalApp,
					{
						txn: makeAssetTransferTxnWithSuggestedParamsFromObject({
							from: app.data.voter,
							to: app.data.appAddress,
							amount: amount,
							assetIndex: app.data.daotokenID,
							suggestedParams: sp
						}),
						signer: signer
					},
					vote,
				],
				onComplete: 'yesVotes' in app.data ? OnApplicationComplete.NoOpOC : OnApplicationComplete.OptInOC,
				suggestedParams: sp,
				sender: app.data.voter,
				signer: signer
			})
			
			await composer.execute(algod, 2)

			return amount
	}, {
		onSuccess: (voteCount) => {
			const yesVotes = (app.data["yesVotes"] || 0) + (vote ? voteCount : 0)
			const noVotes = (app.data["noVotes"] || 0) + (!vote ? voteCount : 0)
			setApp(prev => ({
				stage: 5,
				data: {
					...prev.data,
					yesVotes: yesVotes,
					noVotes: noVotes
				}
			}))
		}
	})

	const votesRemaining = ((app.data.voterTokens || 0) - ((app.data["yesVotes"] || 0) + (app.data["noVotes"] || 0)))

	const { isFetching: vote_ending, isError: end_error, refetch: end_vote } = useQuery(['5', 'end_vote'], async () => {
		const sp = await algod.getTransactionParams().do()
		const composer = new AtomicTransactionComposer()

		composer.addMethodCall({
			appID: app.data.appID,
			method: contract.getMethodByName("end_voting"),
			methodArgs: [app.data.proposalApp],
			sender: app.data.owner,
			suggestedParams: sp,
			signer: makeBasicAccountTransactionSigner(wallets[0])
		});

		return await composer.execute(algod, 2);

	}, {
		onSuccess: () => setApp(prev => ({...prev, stage: 6}))
	})

	return(
		<StageCard currStage={app.stage} triggerStage={5} title="Voting" error={(vote_error || end_error)}>
			<CardContent>
				<Typography textAlign="center">Voting for Proposal App: {'proposalApp' in app.data && app.data.proposalApp}</Typography>
				<Box display="flex" justifyContent="space-between" my={2}>
					<Chip label={'YES: ' + ('yesVotes' in app.data ? app.data.yesVotes : 0)} color="success" />
					<Chip label={'NO: ' + ('noVotes' in app.data ? app.data.noVotes : 0)} color="error" />
				</Box>
				<Box my={4} display="flex" flexDirection="column" alignItems="center">
					<Typography>Enter Vote Amount</Typography>
					<TextField disabled={votesRemaining === 0 || vote_fetching || vote_ending} type="number" variant="standard" size="small" InputProps={{ inputProps: { max: votesRemaining, min: 1 }}} onChange={({target: {value}}) => value > votesRemaining ? setAmount(votesRemaining) : value <= 0 ? setAmount(1) : setAmount(parseInt(value))} value={amount} helperText={`Up to ${votesRemaining} DAO Tokens`} />
				</Box>
			</CardContent>
			<CardActions sx={{flexDirection: 'column'}}>
				<Stack direction="row" spacing={0} alignItems="center">
					<Typography>NO</Typography>
					<Switch checked={vote} onChange={() => setVote(!vote)} color="success" />
					<Typography>YES</Typography>
				</Stack>
				<Box display="flex" gap={2}>
					<LoadingButton sx={{width: '105px'}} variant="contained" onClick={() => refetch()} loading={vote_fetching} color={vote ? "success" : "error"} disabled={app.stage !== 5 || vote_ending || votesRemaining === 0}>Vote {vote ? 'YES' : 'NO'}</LoadingButton>
					<LoadingButton variant="contained" onClick={() => end_vote()} loading={vote_ending} disabled={app.stage !== 5 || !isSuccess || vote_fetching}>End Vote</LoadingButton>
				</Box>
			</CardActions>
		</StageCard>
	)
}