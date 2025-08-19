from web3 import Web3
import os
from dotenv import load_dotenv


load_dotenv()

RPC_URL = os.getenv("RPC_URL")
PRIVATE_KEY = os.getenv("PRIVATE_KEY")
WALLET_ADDRESS = os.getenv("WALLET_ADDRESS")

# print("RPC_URL:", RPC_URL)
# print("Wallet:", WALLET_ADDRESS[:6] + "..." if WALLET_ADDRESS else "None")

# w3 = Web3(Web3.HTTPProvider(RPC_URL))
# print("Connected:", w3.is_connected())


w3 = Web3(Web3.HTTPProvider(RPC_URL))
print("Connected:", w3.is_connected())


def send_tx():
    nonce = w3.eth.get_transaction_count(WALLET_ADDRESS)
    tx = {
        'nonce': nonce,
        'to': WALLET_ADDRESS, 
        'value': w3.to_wei(0.001, 'ether'),
        'gas': 21000,
        'gasPrice': w3.eth.gas_price,
        'chainId': 11155111,
    }
    signed_tx = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    print("Transaction hash:", tx_hash.hex())

send_tx()
