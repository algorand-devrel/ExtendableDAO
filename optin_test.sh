#!/usr/bin/env bash

set -e -u -x

SB="$HOME/sandbox/sandbox"
GOAL="${SB} goal"

ADDR=$(${GOAL} account list | head -n 1 | awk '{print $3}' | tr -d '\r')
VOTER=$(${GOAL} account list | sed -n 3p | awk '{print $3}' | tr -d '\r')

# Create dao_approval.teal and dao_clearstate.teal
python3 ./contracts.py

# Copy TEAL to sandbox
${SB} copyTo dao_approval.teal
${SB} copyTo dao_clearstate.teal

# Delete local dao_approval.teal and dao_clearstate.teal
rm dao_approval.teal dao_clearstate.teal

# Deploy
APP_ID=$(${GOAL} app method \
	--method "deploy(string)bool" \
	--create \
	--from ${ADDR} \
	--approval-prog dao_approval.teal \
	--clear-prog dao_clearstate.teal \
	--global-byteslices 0 --global-ints 64 \
	--local-byteslices 0 --local-ints 16 \
	--arg '"Test DAO"' \
	| grep 'Created app with app index' \
	| awk '{print $6}' \
	| tr -d '\r')
APP_ADDR=$(${GOAL} app info \
	--app-id ${APP_ID} \
	| grep 'Application account' \
	| awk '{print $3}' \
	| tr -d '\r')

# Create Asset
ASSET_ID=$(${GOAL} asset create \
	--creator ${ADDR} \
	--name "Test Asset" \
	--unitname "TA" \
	--total 100 \
	--decimals 0 \
	| grep 'Created asset with asset index' \
	| awk '{print $6}' \
	| tr -d '\r')

# Voter OptIn to Asset
${GOAL} asset send \
	--from ${VOTER} \
	--to ${VOTER} \
	--assetid ${ASSET_ID} \
	--amount 0

# Send Voter Assets
${GOAL} asset send \
	--from ${ADDR} \
	--to ${VOTER} \
	--assetid ${ASSET_ID} \
	--amount 20

# Fund DAO
${GOAL} clerk send \
	--from ${ADDR} \
	--to ${APP_ADDR} \
	--amount 10000000

# Initialise
${GOAL} app method \
	--method "initialise(asset)bool" \
	--from ${ADDR} \
	--app-id ${APP_ID} \
	--arg ${ASSET_ID} \
	--fee 2000

# Create Fake ASAs
ASSET_1=$(${GOAL} asset create \
  --creator ${ADDR} \
  --name "Fake USDC" \
  --unitname "FUSDC" \
  --total 18446744073709551615 \
  --decimals 6 \
  | grep 'Created asset with asset index' \
  | awk '{print $6}' \
  | tr -d '\r')

ASSET_2=$(${GOAL} asset create \
  --creator ${ADDR} \
  --name "Fake USDT" \
  --unitname "FUSDT" \
  --total 18446744073709551615 \
  --decimals 6 \
  | grep 'Created asset with asset index' \
  | awk '{print $6}' \
  | tr -d '\r')

# Deploy Proposed OptIn Functionality
OPTIN_FUNC_TEAL_APPROVAL="example_functionality/func_optin_to_asas.teal"
OPTIN_FUNC_TEAL_CLEAR="example_functionality/func_optin_to_asas_clear.teal"
${SB} copyTo ${OPTIN_FUNC_TEAL_APPROVAL}
${SB} copyTo ${OPTIN_FUNC_TEAL_CLEAR}
${GOAL} app method \
	--method "deploy()void" \
	--create \
	--from ${ADDR} \
	--approval-prog func_optin_to_asas.teal \
	--clear-prog func_optin_to_asas_clear.teal \
	--global-byteslices 8 --global-ints 8 \
	--local-byteslices 4 --local-ints 4 \
	-o appl.txn

# Propose OptIn Functionality
PROP_APP_ID=$(${GOAL} app method \
	--method "propose(appl)uint64" \
	--from ${ADDR} \
	--app-id ${APP_ID} \
	--on-completion "NoOp" \
	--arg appl.txn \
	| grep 'method propose(appl)uint64 succeeded with output' \
	| awk '{print $6}' \
	| tr -d '\r')

# Vote
${GOAL} asset send \
  --from ${VOTER} \
  --to ${APP_ADDR} \
  --assetid ${ASSET_ID} \
  --amount 20 \
  -o votes.txn
${GOAL} app method \
	--method "vote(application,axfer,bool)bool" \
	--from ${VOTER} \
	--app-id ${APP_ID} \
	--on-completion "OptIn" \
	--arg ${PROP_APP_ID} \
        --arg votes.txn \
        --arg true

# End Voting
${GOAL} app method \
  --method "end_voting(application)bool" \
  --from ${ADDR} \
  --app-id ${APP_ID} \
  --on-completion "NoOp" \
  --arg ${PROP_APP_ID}

# Activate
FUNC_APP_ID=$(${GOAL} app method \
	--method "activate(application)uint64" \
	--from ${ADDR} \
	--app-id ${APP_ID} \
	--on-completion "NoOp" \
	--arg ${PROP_APP_ID} \
	--fee 2000 \
	| grep 'method activate(application)uint64 succeeded with output' \
	| awk '{print $6}' \
	| tr -d '\r')

# Delete Proposal
${GOAL} app method \
	--method "deactivate()bool" \
	--from ${ADDR} \
	--app-id ${PROP_APP_ID} \
	--on-completion "DeleteApplication"

# Reclaim ASA
${GOAL} app method \
  --method "reclaim(application,asset)uint64" \
  --from ${VOTER} \
  --app-id ${APP_ID} \
  --on-completion "NoOp" \
  --arg ${PROP_APP_ID} \
  --arg ${ASSET_ID} \
  --fee 2000

# Invoke
${GOAL} app method \
	--method "invoke(application)bool" \
	--from ${ADDR} \
	--app-id ${APP_ID} \
	--on-completion "NoOp" \
	--arg ${FUNC_APP_ID} \
	--foreign-asset ${ASSET_1} \
	--foreign-asset ${ASSET_2}

# Provide 10.0 FUSDC to DAO Address
${GOAL} asset send \
  --from ${ADDR} \
  --to ${APP_ADDR} \
  --assetid ${ASSET_1} \
  --amount 10000000

