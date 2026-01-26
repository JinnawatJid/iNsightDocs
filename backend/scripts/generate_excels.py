import pandas as pd
import os

def create_excels():
    os.makedirs('temp_docs', exist_ok=True)

    # 1. Balance Sheet
    # Needs: 'หนี้สินไม่หมุนเวียน' (Non-Current Liabilities), 'ส่วนของผู้ถือหุ้น' (Equity)
    # Strategy: 'AMOUNT' -> Find 'จำนวนเงิน' column
    df_bs = pd.DataFrame({
        'รายการ': ['สินทรัพย์หมุนเวียน', 'หนี้สินไม่หมุนเวียน', 'ส่วนของผู้ถือหุ้น'],
        'จำนวนเงิน 2567': [1000000, 200000, 500000],
        'จำนวนเงิน 2566': [900000, 150000, 450000]
    })
    df_bs.to_excel('temp_docs/balance_sheet.xlsx', index=False)

    # 2. Profit & Loss
    # Needs: 'รายได้รวม' (Total Revenue), 'กำไร(ขาดทุน) ขั้นต้น' (Gross Profit)
    df_pl = pd.DataFrame({
        'รายการ': ['รายได้จากการขาย', 'รายได้รวม', 'ต้นทุนขาย', 'กำไร(ขาดทุน) ขั้นต้น'],
        'จำนวนเงิน 2567': [5000000, 5000000, 3000000, 2000000],
        'จำนวนเงิน 2566': [4000000, 4000000, 2500000, 1500000]
    })
    df_pl.to_excel('temp_docs/profit_loss.xlsx', index=False)

    # 3. Financial Ratios
    # Needs: 'อัตราส่วนหนี้สินรวมต่อส่วนของผู้ถือหุ้น' (D/E Ratio), 'อัตราการหมุนเวียน' & 'สินค้าคงเหลือ' (Inventory Turnover)
    # Strategy: 'RATIO' -> Find Year columns (2567)
    df_ratios = pd.DataFrame({
        'รายการ': ['อัตราส่วนสภาพคล่อง', 'อัตราส่วนหนี้สินรวมต่อส่วนของผู้ถือหุ้น', 'อัตราการหมุนเวียนของสินค้าคงเหลือ'],
        '2567': [1.5, 0.8, 12.5],
        '2566': [1.4, 0.9, 10.0]
    })
    df_ratios.to_excel('temp_docs/financial_ratios.xlsx', index=False)

    print("Excel files created in temp_docs/")

if __name__ == "__main__":
    create_excels()
