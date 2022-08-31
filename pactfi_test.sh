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
	--global-byteslices 0 --global-ints 5 \
	--local-byteslices 0 --local-ints 8 \
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

# Setup PactFi Liquidity Pool
cat example_functionality/pactfi_pool_contract_template.teal | sed "s/{ASSET_1}/${ASSET_1}/g" | sed "s/{ASSET_2}/${ASSET_2}/g" > example_functionality/pool_approval.teal

${SB} copyTo example_functionality/pool_approval.teal
${SB} copyTo example_functionality/pool_clear.teal
rm example_functionality/pool_approval.teal

# Deploy Pool
POOL_ID=$(${GOAL} app create \
  --creator ${ADDR} \
  --approval-prog pool_approval.teal \
  --clear-prog pool_clear.teal \
  --global-byteslices 1 --global-ints 4 \
  --local-byteslices 0 --local-ints 0 \
  --foreign-asset ${ASSET_1} \
  --foreign-asset ${ASSET_2} \
  | grep 'Created app with app index' \
  | awk '{print $6}' \
  | tr -d '\r')
POOL_ADDR=$(${GOAL} app info \
  --app-id ${POOL_ID} \
  | grep 'Application account' \
  | awk '{print $3}' \
  | tr -d '\r')

# Fund Pool
# Create Liquidity Token
# OptIn Assets
${GOAL} clerk send \
  --from ${ADDR} \
  --to ${POOL_ADDR} \
  --amount 400000 \
  -o 0_fund.txn
${GOAL} app call \
  --from ${ADDR} \
  --app-id ${POOL_ID} \
  --app-arg "str:CLT" \
  --foreign-asset ${ASSET_1} \
  --foreign-asset ${ASSET_2} \
  --fee 2000 \
  -o 1_clt.txn
${GOAL} app call \
  --from ${ADDR} \
  --app-id ${POOL_ID} \
  --app-arg "str:OPTIN" \
  --foreign-asset ${ASSET_1} \
  --foreign-asset ${ASSET_2} \
  --fee 3000 \
  -o 2_optin.txn
${SB} copyFrom 0_fund.txn
${SB} copyFrom 1_clt.txn
${SB} copyFrom 2_optin.txn
cat 0_fund.txn 1_clt.txn 2_optin.txn > init.ctxn
${SB} copyTo init.ctxn
rm 0_fund.txn 1_clt.txn 2_optin.txn init.ctxn
${GOAL} clerk group -i init.ctxn -o init.gtxn
${GOAL} clerk sign -i init.gtxn -o init.stxn
${GOAL} clerk rawsend -f init.stxn

# Find Liquidity Token
LP_ID=$(${GOAL} account info \
  -a ${POOL_ADDR} \
  | grep 'PACT LP Token' \
  | head -n1 \
  | awk '{print $2}' \
  | tr -d ',\r')

# OptIn Liquidity Token
# Add Liquidity Asset 1
# Add Liquidity Asset 2
# Call ADDLIQ
${GOAL} asset send \
  --from ${ADDR} \
  --to ${ADDR} \
  --assetid ${LP_ID} \
  --amount 0 \
  -o 0_optin.txn
${GOAL} asset send \
  --from ${ADDR} \
  --to ${POOL_ADDR} \
  --assetid ${ASSET_1} \
  --amount 1000000000 \
  -o 1_a1_in.txn
${GOAL} asset send \
  --from ${ADDR} \
  --to ${POOL_ADDR} \
  --assetid ${ASSET_2} \
  --amount 1000000000 \
  -o 2_a2_in.txn
${GOAL} app call \
  --from ${ADDR} \
  --app-id ${POOL_ID} \
  --app-arg "str:ADDLIQ" \
  --app-arg "int:0" \
  --foreign-asset ${ASSET_1} \
  --foreign-asset ${ASSET_2} \
  --foreign-asset ${LP_ID} \
  --fee 4000 \
  -o 3_addliq.txn
${SB} copyFrom 0_optin.txn
${SB} copyFrom 1_a1_in.txn
${SB} copyFrom 2_a2_in.txn
${SB} copyFrom 3_addliq.txn
cat 0_optin.txn 1_a1_in.txn 2_a2_in.txn 3_addliq.txn > addliq.ctxn
${SB} copyTo addliq.ctxn
rm 0_optin.txn 1_a1_in.txn 2_a2_in.txn 3_addliq.txn addliq.ctxn
${GOAL} clerk group -i addliq.ctxn -o addliq.gtxn
${GOAL} clerk sign -i addliq.gtxn -o addliq.stxn
${GOAL} clerk rawsend -f addliq.stxn

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

# Propose Functionality 1
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

# Deploy Proposed PactFi Swap Functionality
FUNC_TEAL_APPROVAL="example_functionality/func_pactfi_swap.teal"
FUNC_TEAL_CLEAR="example_functionality/func_pactfi_clear.teal"
${SB} copyTo ${FUNC_TEAL_APPROVAL}
${SB} copyTo ${FUNC_TEAL_CLEAR}
${GOAL} app method \
	--method "deploy()void" \
	--create \
	--from ${ADDR} \
	--approval-prog func_pactfi_swap.teal \
	--clear-prog func_pactfi_clear.teal \
	--global-byteslices 1 --global-ints 4 \
	--local-byteslices 0 --local-ints 0 \
	-o appl.txn

# Propose PactFi Swap Functionality
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
	--on-completion "NoOp" \
	--arg ${PROP_APP_ID} \
        --arg votes.txn \
        --arg true

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

# Invoke Swap
# 5 FUSDC for at least 4.8 FUSDT
${GOAL} app call \
  --from ${ADDR} \
  --app-id ${APP_ID} \
  --app-arg "b64:4s99AA==" \
  --app-arg "b64:AQ==" \
  --app-arg "int:5000000" \
  --app-arg "int:4800000" \
  --foreign-app ${FUNC_APP_ID} \
  --foreign-app ${POOL_ID} \
  --foreign-asset ${ASSET_1} \
  --foreign-asset ${ASSET_2} \
  --app-account ${POOL_ADDR} \
  --fee 6000

exit

# Destroy
${GOAL} app method \
	--method "destroy()bool" \
	--from ${ADDR} \
	--app-id ${APP_ID} \
	--on-completion "DeleteApplication"

