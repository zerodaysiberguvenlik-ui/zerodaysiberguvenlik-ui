import os
import sys
import time
import re
from dotenv import load_dotenv
from web3 import Web3
from loguru import logger

# UTF-8 setup
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv(override=True)

BYTECODE_PATH = os.path.join(os.path.dirname(__file__), "contract_bytecode.hex")

def get_deployment_bytecode() -> bytes:
    with open(BYTECODE_PATH, "r") as f:
        hex_data = f.read().strip()
    if not hex_data.startswith("0x"):
        hex_data = "0x" + hex_data
    return Web3.to_bytes(hexstr=hex_data)

def deploy_new_contract(w3: Web3, private_key: str):
    """
    Base Mainnet üzerinde yeni V2 Flashloan Arbitraj Sözleşmesini deploy eder.
    Sözleşmenin 'owner' adresi kalıcı ve değiştirilemez (immutable) olarak
    bu işlemi imzalayan cüzdan (private_key sahibi) olacaktır.
    """
    acct = w3.eth.account.from_key(private_key)
    deployer_addr = acct.address

    balance_wei = w3.eth.get_balance(deployer_addr)
    gas_price = w3.eth.gas_price
    min_needed_wei = int(1350000 * gas_price * 1.5)

    if balance_wei < min_needed_wei:
        needed_eth = float(w3.from_wei(min_needed_wei, 'ether'))
        current_eth = float(w3.from_wei(balance_wei, 'ether'))
        return {
            "success": False,
            "error": "insufficient_funds",
            "message": f"Gas bakiyesi yetersiz. Mevcut: {current_eth:.6f} ETH, Gereken: ~{needed_eth:.6f} ETH (~$0.20 - $0.50)",
            "deployer": deployer_addr
        }

    deploy_data = get_deployment_bytecode()
    nonce = w3.eth.get_transaction_count(deployer_addr, 'pending')
    latest_block = w3.eth.get_block('latest')
    base_fee = latest_block.get('baseFeePerGas', gas_price)
    priority_fee = w3.to_wei(0.05, 'gwei')
    max_fee = int(base_fee * 1.5) + priority_fee

    tx = {
        'from': deployer_addr,
        'nonce': nonce,
        'gas': 1350000,
        'maxFeePerGas': max_fee,
        'maxPriorityFeePerGas': priority_fee,
        'chainId': 8453,
        'data': deploy_data
    }

    signed_tx = acct.sign_transaction(tx)
    raw_tx = signed_tx.raw_transaction if hasattr(signed_tx, 'raw_transaction') else signed_tx.rawTransaction
    tx_hash = w3.eth.send_raw_transaction(raw_tx)
    tx_hash_hex = tx_hash.hex()
    logger.info(f"🚀 Deploy işlemi Base ağına iletildi! Tx: https://basescan.org/tx/{tx_hash_hex}")

    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

    if receipt['status'] == 1:
        new_contract = receipt['contractAddress']
        logger.success(f"👑 Yeni Sözleşme Başarıyla Deploy Edildi: {new_contract}")

        # .env dosyasını güncelle
        env_path = os.path.join(os.path.dirname(__file__), ".env")
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                content = f.read()
            content = re.sub(
                r"ARBITRAGE_CONTRACT_ADDRESS=.*",
                f"ARBITRAGE_CONTRACT_ADDRESS={new_contract}",
                content
            )
            with open(env_path, "w", encoding="utf-8") as f:
                f.write(content)

        # dashboard/state.json güncelle
        state_path = os.path.join(os.path.dirname(__file__), "dashboard", "state.json")
        if os.path.exists(state_path):
            try:
                import json
                with open(state_path, "r", encoding="utf-8") as f:
                    sdata = json.load(f)
                sdata["contract_address"] = new_contract
                sdata["wallet_address"] = deployer_addr
                with open(state_path, "w", encoding="utf-8") as f:
                    json.dump(sdata, f, indent=2, ensure_ascii=False)
            except Exception:
                pass

        return {
            "success": True,
            "contract_address": new_contract,
            "tx_hash": tx_hash_hex,
            "deployer": deployer_addr
        }
    else:
        return {
            "success": False,
            "error": "reverted",
            "message": f"İşlem zincirde revert oldu. Tx: {tx_hash_hex}",
            "deployer": deployer_addr
        }

if __name__ == '__main__':
    rpc_url = os.getenv("BASE_RPC_URL", "https://mainnet.base.org")
    pk = os.getenv("PRIVATE_KEY", "").strip()
    if not pk:
        logger.error("❌ PRIVATE_KEY .env dosyasında bulunamadı!")
        sys.exit(1)
    w3_conn = Web3(Web3.HTTPProvider(rpc_url))
    res = deploy_new_contract(w3_conn, pk)
    logger.info(res)
