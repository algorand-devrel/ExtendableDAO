import { useState } from "react";
import { Typography, Box, CircularProgress, Link, Button } from "@mui/material";
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Header from "./components/Header";
import { useSandboxData, useSandboxActive } from "./hooks/useSandbox";
import useWallets from "./hooks/useWallets";

import { Algodv2, ABIContract } from "algosdk";
import dao_abi from './contracts/dao_abi.json'

import DeployApp from "./stages/0_deploy_app";
import DAOToken from "./stages/1_dao_token";
import InitDAO from "./stages/2_init_dao";
import FakeASA from "./stages/3_fake_asa";
import ProposeFunctionality from "./stages/4_propose_func";
import Voting from "./stages/5_voting";
import Proposal from "./stages/6_proposal";
import Invoke from "./stages/7_invoke";

const contract = new ABIContract(dao_abi)

export default function App() {
	const [app, setApp] = useState({
		stage: 0,
		data: {}
	})


	const [sandbox, setSandbox] = useSandboxData()
	const { data: sandbox_conn } = useSandboxActive(sandbox)

	const {data: wallets} = useWallets()

	const algod = new Algodv2(sandbox.algod_token, "http://localhost", sandbox.algod_port)

	console.log(app)

	return (
		<main id="App">
			<Header data={sandbox_conn} sandbox={sandbox} setSandbox={setSandbox} />
			<Typography variant="h3" fontWeight={700} textAlign="center" mb={2}>Extendable DAO Demo</Typography>
			
			{(!sandbox_conn.algod || !sandbox_conn.kmd || typeof wallets === 'undefined') ? 
			<CircularProgress color="primary" size="5rem" sx={{margin: '0 auto'}} /> : 
			<Box display="flex" flexDirection="column" gap={2} position="relative" alignItems="center">
				<Box display="flex" flexDirection="column" gap={2} pt={1}>
					<DeployApp app={app} setApp={setApp} algod={algod} contract={contract} wallets={wallets} />
					{'appAddress' in app.data && <Link href={`https://explorer.dappflow.org/explorer/account/${app.data.appAddress}/assets`} target="_blank" rel="noopener noreferrer"><Button variant="contained">View App Assets in DAppFlow <OpenInNewIcon /></Button></Link>}
				</Box>
				<Box display="flex" gap={2}>
					<DAOToken app={app} setApp={setApp} algod={algod} wallets={wallets} />
					<Box display="flex" flexDirection="column" gap={2}>
						<InitDAO app={app} setApp={setApp} algod={algod} contract={contract} wallets={wallets} />
						<FakeASA app={app} setApp={setApp} algod={algod} wallets={wallets} />
					</Box>
					<ProposeFunctionality app={app} setApp={setApp} algod={algod} contract={contract} wallets={wallets} />
				</Box>
				<Box display="flex" gap={2} pb={1}>
					<Voting app={app} setApp={setApp} algod={algod} contract={contract} wallets={wallets} />
					<Box display="flex" flexDirection="column" gap={2}>
						<Proposal app={app} setApp={setApp} algod={algod} contract={contract} wallets={wallets} />
						<Invoke app={app} algod={algod} contract={contract} wallets={wallets} />
					</Box>
				</Box>
			</Box>}
		</main>
	);
}
