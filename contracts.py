#!/usr/bin/env python3

from configparser import NoOptionError
import json

from pyteal import * 

router = Router("ExtendableDAO")


@router.method(no_op=CallConfig.CREATE)
def deploy(name: abi.String, *, output: abi.Bool) -> Expr:
    return Seq(
        App.globalPut(Bytes("uninitialised"), Int(1)),
        output.set(True),
    )


@router.method(no_op=CallConfig.CALL)
def initialise(token: abi.Asset, *, output: abi.Bool) -> Expr:
    return Seq(
        Assert(App.globalGet(Bytes("uninitialised"))),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields(
            {
                TxnField.type_enum: TxnType.AssetTransfer,
                TxnField.asset_receiver: Global.current_application_address(),
                TxnField.xfer_asset: token.asset_id(),
            }
        ),
        InnerTxnBuilder.Submit(),
        App.globalPut(Bytes("asset_id"), token.asset_id()),
        App.globalDel(Bytes("uninitialised")),
        output.set(True),
    )


@router.method(no_op=CallConfig.CALL)
def activate(app: abi.Application, *, output: abi.Uint64) -> Expr:
    proposal_for = Concat(
        Bytes("proposal_"),
        Itob(app.application_id()),
        Bytes("_for"),
    )
    proposal_against = Concat(
        Bytes("proposal_"),
        Itob(app.application_id()),
        Bytes("_against"),
    )
    return Seq(
        votes_for := App.globalGetEx(Global.current_application_id(), proposal_for),
        votes_against := App.globalGetEx(Global.current_application_id(), proposal_against),
        voting_allowed := App.globalGetEx(Int(0), Itob(app.application_id())),
        Assert(Not(voting_allowed.hasValue())),
        Assert(votes_for.hasValue()),
        Assert(votes_against.hasValue()),
        Assert(votes_for.value() > votes_against.value()),
        app_approval := AppParam.approvalProgram(app.application_id()),
        Assert(app_approval.hasValue()),
        app_clearstate := AppParam.clearStateProgram(app.application_id()),
        Assert(app_clearstate.hasValue()),
        app_global_byteslices := AppParam.globalNumByteSlice(app.application_id()),
        app_global_ints := AppParam.globalNumUint(app.application_id()),
        app_local_byteslices := AppParam.localNumByteSlice(app.application_id()),
        app_local_ints := AppParam.localNumUint(app.application_id()),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields(
            {
                TxnField.type_enum: TxnType.ApplicationCall,
                TxnField.application_args: [MethodSignature("deploy()bool")],
                TxnField.approval_program: app_approval.value(),
                TxnField.clear_state_program: app_clearstate.value(),
                TxnField.global_num_byte_slices: app_global_byteslices.value(),
                TxnField.global_num_uints: app_global_ints.value(),
                TxnField.local_num_byte_slices: app_local_byteslices.value(),
                TxnField.local_num_uints: app_local_ints.value(),
                TxnField.fee: Int(0),
            }
        ),
        InnerTxnBuilder.Submit(),
        App.globalDel(proposal_for),
        App.globalDel(proposal_against),
        output.set(InnerTxn.created_application_id()),
    )


@router.method(delete_application=CallConfig.CALL)
def deactivate(*, output: abi.Bool) -> Expr:
    return output.set(True)


@router.method(no_op=CallConfig.CALL,opt_in=CallConfig.CALL)
def vote(
    app: abi.Application, votes: abi.AssetTransferTransaction, for_or_against: abi.Bool, *, output: abi.Bool
) -> Expr:
    prop_for_bytes = Concat(
        Bytes("proposal_"),
        Itob(app.application_id()),
        Bytes("_for"),
    )
    prop_against_bytes = Concat(
        Bytes("proposal_"),
        Itob(app.application_id()),
        Bytes("_against"),
    )
    asset_id = App.globalGet(Bytes("asset_id"))
    return Seq(
        (proposal_for := ScratchVar()).store(prop_for_bytes),
        (proposal_against := ScratchVar()).store(prop_against_bytes),
        voting_allowed := App.globalGetEx(Int(0), Itob(app.application_id())),
        Assert(voting_allowed.hasValue()),
        Assert(votes.get().asset_receiver() == Global.current_application_address()),
        Assert(votes.get().xfer_asset() == asset_id),
        If(for_or_against.get(), Seq(
            App.localPut(Int(0), proposal_for.load(), App.localGet(Int(0), proposal_for.load()) + votes.get().asset_amount()),
            App.globalPut(proposal_for.load(), App.globalGet(proposal_for.load()) + votes.get().asset_amount()),
        ), Seq(
            App.localPut(Int(0), proposal_against.load(), App.localGet(Int(0), proposal_against.load()) + votes.get().asset_amount()),
            App.globalPut(proposal_against.load(), App.globalGet(proposal_against.load()) + votes.get().asset_amount()),
        )),
        output.set(True),
    )


@router.method(no_op=CallConfig.CALL)
def reclaim(app: abi.Application, asset: abi.Asset, *, output: abi.Uint64) -> Expr:
    prop_for_bytes = Concat(
        Bytes("proposal_"),
        Itob(app.application_id()),
        Bytes("_for"),
    )
    prop_against_bytes = Concat(
        Bytes("proposal_"),
        Itob(app.application_id()),
        Bytes("_against"),
    )
    asset_id = App.globalGet(Bytes("asset_id"))
    return Seq(
        Assert(asset_id == asset.asset_id()),
        (total := ScratchVar(TealType.uint64)).store(
            App.localGet(Int(0), prop_for_bytes) + App.localGet(Int(0), prop_against_bytes)
        ),
        Assert(total.load()),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields(
            {
                TxnField.type_enum: TxnType.AssetTransfer,
                TxnField.asset_receiver: Txn.sender(),
                TxnField.xfer_asset: asset_id,
                TxnField.asset_amount: total.load(),
            }
        ),
        InnerTxnBuilder.Submit(),
        votes_for := App.globalGetEx(Global.current_application_id(), prop_for_bytes),
        votes_against := App.globalGetEx(Global.current_application_id(), prop_against_bytes),
        # Reduce global for
        If(votes_for.hasValue()).Then(
            App.globalPut(prop_for_bytes, App.globalGet(prop_for_bytes) - App.localGet(Int(0), prop_for_bytes)),
        ),
        # Reduce global against
        If(votes_against.hasValue()).Then(
            App.globalPut(prop_against_bytes, App.globalGet(prop_against_bytes) - App.localGet(Int(0), prop_against_bytes)),
        ),
        # Delete local amounts
        App.localDel(Int(0), prop_for_bytes),
        App.localDel(Int(0), prop_against_bytes),
        output.set(total.load()),
    )


@router.method(no_op=CallConfig.CALL)
def propose(appl: abi.ApplicationCallTransaction, *, output: abi.Uint64) -> Expr:
    proposal_for = Concat(
        Bytes("proposal_"),
        Itob(appl.get().created_application_id()),
        Bytes("_for"),
    )
    proposal_against = Concat(
        Bytes("proposal_"),
        Itob(appl.get().created_application_id()),
        Bytes("_against"),
    )
    return Seq(
        Assert(appl.get().type_enum() == TxnType.ApplicationCall),
        Assert(Not(appl.get().application_id())),
        Assert(appl.get().on_completion() == OnComplete.NoOp),
        (new_app_pages := AppParam.extraProgramPages(appl.get().created_application_id())),
        Assert(Not(new_app_pages.value())),
        Comment("TODO: Some sort of validation on proposed app"),
        (new_app_approval := AppParam.approvalProgram(appl.get().created_application_id())),
        Assert(Extract(new_app_approval.value(), Int(1), Int(4)) == Bytes("base16", "0x20020100")),
        Comment("TODO: Some sort of validation on proposed app"),
        (new_app_clearstate := AppParam.clearStateProgram(appl.get().created_application_id())),
        Assert(new_app_clearstate.hasValue()),
        App.globalPut(proposal_for, Int(0)),
        App.globalPut(proposal_against, Int(0)),
        App.globalPut(Itob(GeneratedID(appl.index())), Global.round()),
        output.set(appl.get().created_application_id()),
    )


@router.method(no_op=CallConfig.CALL)
def end_voting(app: abi.Application, *, output: abi.Bool) -> Expr:
    return Seq(
        (app_params := AppParam.creator(app.application_id())),
        Assert(Txn.sender() == app_params.value()),
        voting_allowed := App.globalGetEx(Int(0), Itob(app.application_id())),
        Assert(voting_allowed.hasValue()),
        Assert(Global.round() > voting_allowed.value()),
        App.globalDel(Itob(app.application_id())),
        output.set(True),
    )


@router.method(no_op=CallConfig.CALL)
def invoke(app: abi.Application, *, output: abi.Bool) -> Expr:
    i = ScratchVar(TealType.uint64)
    return Seq(
        (app_creator := AppParam.creator(app.application_id())),
        (app_addr := AppParam.address(app.application_id())),
        Assert(app_creator.value() == Global.current_application_address()),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields(
            {
                TxnField.type_enum: TxnType.ApplicationCall,
                TxnField.application_id: app.application_id(),
                TxnField.application_args: [ MethodSignature("invoke()bool") ],
                TxnField.rekey_to: app_addr.value(),
            }
        ),
        Comment("Add all assets"),
        For(i.store(Int(0)), i.load() < Txn.assets.length(), i.store(i.load() + Int(1))).Do(
            InnerTxnBuilder.SetField(TxnField.assets, [Txn.assets[i.load()]]),
        ),
        Comment("Add all apps"),
        For(i.store(Int(2)), i.load() <= Txn.applications.length(), i.store(i.load() + Int(1))).Do(
            InnerTxnBuilder.SetField(TxnField.applications, [Txn.applications[i.load()]]),
        ),
        Comment("Add all accounts"),
        For(i.store(Int(1)), i.load() < Txn.accounts.length(), i.store(i.load() + Int(1))).Do(
            InnerTxnBuilder.SetField(TxnField.accounts, [Txn.accounts[i.load()]]),
        ),
        Comment("Add all args"),
        For(i.store(Int(2)), i.load() < Txn.application_args.length(), i.store(i.load() + Int(1))).Do(
            InnerTxnBuilder.SetField(TxnField.application_args, [Txn.application_args[i.load()]]),
        ),
        InnerTxnBuilder.Submit(),
        Comment("Check we've been rekeyed back to our own account"),
        (acct_auth := AccountParam.authAddr(Global.current_application_address())),
        Assert(acct_auth.value() == Global.zero_address()),
        output.set(True),
    )


@router.method(clear_state=CallConfig.CALL)
def clear_state() -> Expr:
    return Approve()


approval, clearstate, abi = router.compile_program(
    version=7,
    optimize=OptimizeOptions(scratch_slots=True),
)

if __name__ == "__main__":
    with open("dao_approval.teal", "w") as f:
        f.write(approval)
    
    with open("dao_clearstate.teal", "w") as f:
        f.write(clearstate)

    with open("dao_abi.json", "w") as f:
        f.write(json.dumps(abi.dictify()))

