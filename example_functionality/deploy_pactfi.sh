#!/usr/bin/env bash

set -e -u -x

SB="$HOME/sandbox/sandbox"
GOAL="${SB} goal"

DEPLOYER=$(${GOAL} account list | head -n 1 | awk '{print $3}' | tr -d '\r')

ASSET_1=$(${GOAL} asset create \
  --creator ${DEPLOYER} \
  --name "Fake USDC" \
  --unitname "FUSDC" \
  --total 18446744073709551615 \
  --decimals 6 \
  | grep 'Created asset with asset index' \
  | awk '{print $6}' \
  | tr -d '\r')

ASSET_2=$(${GOAL} asset create \
  --creator ${DEPLOYER} \
  --name "Fake USDT" \
  --unitname "FUSDT" \
  --total 18446744073709551615 \
  --decimals 6 \
  | grep 'Created asset with asset index' \
  | awk '{print $6}' \
  | tr -d '\r')

cat pactfi_pool_contract_template.teal | sed "s/{ASSET_1}/${ASSET_1}/g" | sed "s/{ASSET_2}/${ASSET_2}/g" > approval.teal

${SB} copyTo approval.teal
${SB} copyTo clear.teal
rm approval.teal

# Deploy Pool
POOL_ID=$(${GOAL} app create \
  --creator ${DEPLOYER} \
  --approval-prog approval.teal \
  --clear-prog clear.teal \
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
  --from ${DEPLOYER} \
  --to ${POOL_ADDR} \
  --amount 400000 \
  -o 0_fund.txn
${GOAL} app call \
  --from ${DEPLOYER} \
  --app-id ${POOL_ID} \
  --app-arg "str:CLT" \
  --foreign-asset ${ASSET_1} \
  --foreign-asset ${ASSET_2} \
  --fee 2000 \
  -o 1_clt.txn
${GOAL} app call \
  --from ${DEPLOYER} \
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
  --from ${DEPLOYER} \
  --to ${DEPLOYER} \
  --assetid ${LP_ID} \
  --amount 0 \
  -o 0_optin.txn
${GOAL} asset send \
  --from ${DEPLOYER} \
  --to ${POOL_ADDR} \
  --assetid ${ASSET_1} \
  --amount 100000000 \
  -o 1_a1_in.txn
${GOAL} asset send \
  --from ${DEPLOYER} \
  --to ${POOL_ADDR} \
  --assetid ${ASSET_2} \
  --amount 100000000 \
  -o 2_a2_in.txn
${GOAL} app call \
  --from ${DEPLOYER} \
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
rm 0_optin.txn 1_a1_in.txn 2_a2_in.txn 3_addliq.txn
${GOAL} clerk group -i addliq.ctxn -o addliq.gtxn
${GOAL} clerk sign -i addliq.gtxn -o addliq.stxn
${GOAL} clerk rawsend -f addliq.stxn

# Swap Asset 1 for Asset 2
${GOAL} asset send \
  --from ${DEPLOYER} \
  --to ${POOL_ADDR} \
  --assetid ${ASSET_1} \
  --amount 1000000 \
  -o 0_a1_in.txn
${GOAL} app call \
  --from ${DEPLOYER} \
  --app-id ${POOL_ID} \
  --app-arg "str:SWAP" \
  --app-arg "int:900000" \
  --foreign-asset ${ASSET_1} \
  --foreign-asset ${ASSET_2} \
  --fee 2000 \
  -o 1_swap.txn
${SB} copyFrom 0_a1_in.txn
${SB} copyFrom 1_swap.txn
cat 0_a1_in.txn 1_swap.txn > swap.ctxn
${SB} copyTo swap.ctxn
rm 0_a1_in.txn 1_swap.txn swap.ctxn
${GOAL} clerk group -i swap.ctxn -o swap.gtxn
${GOAL} clerk sign -i swap.gtxn -o swap.stxn
${GOAL} clerk rawsend -f swap.stxn

