# this file ensures efficient use of the llm when the prompts from the user are simple or when they are offline
import re

def fallback_parse(prompt: str):
    prompt = prompt.lower()

    #Rule:swapping
    swap_match = re.search(r"swap\s+([\d.]+)?\s*(\w+)\s+(to|for)\s+(\w+)", prompt)
    if swap_match:
        return {
            "intent": "swap",
            "amount": float(swap_match.group(1)) if swap_match.group(1) else None,
            "from_token": swap_match.group(2).upper(),
            "to_token": swap_match.group(4).upper()
        }

    #Rule: POrtfolio Checking
    if "portfolio" in prompt or "holdings" in prompt:
        return {"intent": "portfolio_check"}

    #Rule:balance heck
    bal_match = re.search(r"how much\s+(\w+)\s+do i have", prompt)
    if bal_match:
        return {
            "intent": "check_balance",
            "token": bal_match.group(1).upper()
        }

    #rule: Tokensend
    send_match = re.search(r"send\s+([\d.]+)\s+(\w+)\s+to\s+(0x[a-fA-F0-9]{40})", prompt)
    if send_match:
        return {
            "intent": "send",
            "amount": float(send_match.group(1)),
            "token": send_match.group(2).upper(),
            "to_address": send_match.group(3)
        }

    return None

