import { useState } from 'react'
import { Button, Box, Chip, Divider, Dialog, DialogTitle, DialogContent, List, ListItem, ListItemText, TextField, Typography, Stack } from '@mui/material';
import { TuneTwoTone, WalletRounded } from '@mui/icons-material';
import useWallets from '../hooks/useWallets'
import { secretKeyToMnemonic } from 'algosdk';

export default function Header({data, sandbox, setSandbox}){
	const [openSandbox, setOpenSandbox] = useState(false)
	const [openWallets, setOpenWallets] = useState(false)

	const { data: wallets } = useWallets(data.kmd)

	return(
		<>
		<header style={{display: 'flex', justifyContent: 'space-between'}}>
			<Box>
				<Button variant="outlined" startIcon={<TuneTwoTone />} onClick={() => setOpenSandbox(true)}>Sandbox</Button>
				<Stack direction="row" spacing={2} mt={1}>
					<Chip label={"Algod " + (data.algod ? 'Online' : 'Offline') } color={data.algod ? 'success' : 'error'} />
					<Chip label={"Indexer " + (data.indexer ? 'Online' : 'Offline') } color={data.indexer ? 'success' : 'error'} />
					<Chip label={"KMD " + (data.kmd ? 'Online' : 'Offline') } color={data.kmd ? 'success' : 'error'} />
				</Stack>
			</Box>
			<Dialog open={openSandbox}>
				<DialogTitle>Sandbox Config</DialogTitle>
				<DialogContent>
					<Box sx={{ '& > :not(style)': { m: 1, ml: 0, width: '350px' }, }}>
						<Typography variant="h6" mb={2}>Algod Connection</Typography>
						<TextField type="number" label="Algod Port" value={sandbox.algod_port} onChange={({target: {value}}) => setSandbox({...sandbox, algod_port: parseInt(value)})} />
						<TextField multiline label="Algod Token" value={sandbox.algod_token} onChange={({target: {value}}) => setSandbox({...sandbox, algod_token: value})} />
					</Box>
					<Box sx={{ '& > :not(style)': { m: 1, ml: 0, width: '350px' }, }}>
						<Typography variant="h6" mb={2}>Indexer Connection</Typography>
						<TextField type="number" label="Indexer Port" value={sandbox.indexer_port} onChange={({target: {value}}) => setSandbox({...sandbox, indexer_port: parseInt(value)})} />
						<TextField multiline label="Indexer Token" value={sandbox.indexer_token} onChange={({target: {value}}) => setSandbox({...sandbox, indexer_token: value})} />
					</Box>
					<Box sx={{ '& > :not(style)': { m: 1, ml: 0, width: '350px' }, }}>
						<Typography variant="h6" mb={2}>KMD Connection</Typography>
						<TextField type="number" label="KMD Port" value={sandbox.kmd_port} onChange={({target: {value}}) => setSandbox({...sandbox, kmd_port: parseInt(value)})} />
						<TextField multiline label="KMD Token" value={sandbox.kmd_token} onChange={({target: {value}}) => setSandbox({...sandbox, kmd_token: value})} />
					</Box>
					<Button sx={{mt: 2}} variant="contained" onClick={() => setOpenSandbox(false)}>Save</Button>
				</DialogContent>
			</Dialog>

			<Box>
				<Button onClick={() => setOpenWallets(true)} variant="outlined" startIcon={<WalletRounded />} disabled={(typeof wallets === 'undefined'|| wallets.length === 0)}>Wallets</Button>
				<Stack direction="row" spacing={2} mt={1}>
					<Chip label={(typeof wallets === 'undefined' || wallets.length === 0) ? "Wallets Unavailable" : "Wallet Available"} color={(typeof wallets === 'undefined' || wallets.length === 0) ? 'error' : 'success'} />
				</Stack>
			</Box>
			<Dialog open={openWallets} onClose={() => setOpenWallets(false)} fullWidth maxWidth="md">
				<DialogTitle>Wallet Details</DialogTitle>
				<DialogContent sx={{wordWrap: 'break-word'}}>
					<List>
					{typeof wallets !== 'undefined' && wallets.length > 0 && wallets.map(wallet => 
						<ListItem key={wallet.addr}>	
							<ListItemText primary={wallet.addr} secondary={secretKeyToMnemonic(wallet.sk)} />
						</ListItem>
					)}
					</List>
				</DialogContent>
			</Dialog>
		</header>
		<Divider />
		</>
	)
}