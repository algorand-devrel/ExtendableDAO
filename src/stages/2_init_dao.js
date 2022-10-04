import StageCard from "../components/StageCard";
import { CardActions, CardContent, Typography } from "@mui/material";
import { LoadingButton } from '@mui/lab';
import { useQuery } from "@tanstack/react-query";
import { AtomicTransactionComposer, makeBasicAccountTransactionSigner } from "algosdk";

export default function InitDAO({app, setApp, algod, contract, wallets}){

	const { isFetching, isError, refetch } = useQuery(['2', 'init_dao'], async () => {
			let sp = await algod.getTransactionParams().do()
			sp.fee = 2000

			const composer = new AtomicTransactionComposer()
			composer.addMethodCall({
				appID: app.data.appID,
				method: contract.getMethodByName("initialise"),
				methodArgs: [app.data.daotokenID],
				sender: app.data.owner,
				suggestedParams: sp,
				signer: makeBasicAccountTransactionSigner(wallets[0])
			})

			return await composer.execute(algod, 2)
	}, {
		onSuccess: () => setApp(prev => ({...prev, stage: 3}))
	})

	return(
		<StageCard currStage={app.stage} triggerStage={2} title="Initialise DAO" error={isError}>
			<CardContent>
				<Typography>Initialise DAO with DAO Token</Typography>
			</CardContent>
			<CardActions>
				<LoadingButton variant="contained" onClick={() => refetch()} loading={isFetching} disabled={app.stage !== 2}>Initialise DAO</LoadingButton>
			</CardActions>
		</StageCard>
	)
}