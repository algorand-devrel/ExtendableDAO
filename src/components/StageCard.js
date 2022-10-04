import { Card, Typography, Alert, Divider, Avatar, Box } from "@mui/material"
import CheckIcon from '@mui/icons-material/Check'
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';

export default function StageCard({currStage, triggerStage, title, children, error, sx}){
    const current = currStage === triggerStage;
    const isComplete = currStage > triggerStage

    return(
        <Card elevation={current ? 4 : 2} style={{opacity: current ? 1 : 0.5, pointerEvents: current ? 'all' : 'none'}} sx={{padding: 2, borderRadius: '0.5rem', ...sx}}>
        {/* 
            <Chip sx={{marginLeft: 1}} size="small" icon={isComplete && <CheckIcon />} label={!isComplete && triggerStage} color={isComplete ? 'success' : 'primary'} /> */}

            <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Avatar variant="rounded" sx={{width: '2rem', height: '2rem', bgcolor: isComplete ? "#2e7d32" : error ? "#d32f2f" : "#1976d2"}}>{isComplete ? <CheckIcon /> : error ? <PriorityHighIcon /> : triggerStage}</Avatar>
                <Typography variant="h5">{title}</Typography>
            </Box>
            <Divider />
            {children}
            {error && <Alert severity="error">An Error Occurred.</Alert>}
        </Card>
    )
}