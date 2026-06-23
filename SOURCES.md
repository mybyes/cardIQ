# Data sources (researched June 2026)

All card data in `data.mjs` and valuations in `valuation.mjs` were compiled from the
sources below. **Indian card T&Cs change constantly** — re-verify against the issuer's
MITC before any production or financial use. Key 2026 changes already reflected:

- **SBI Cashback** — April 2026 cap cut to ₹2,000 online + ₹2,000 offline (₹4,000 combined/cycle), new exclusions (gaming, tolls, govt).
- **Axis Atlas** — April 2026 transfer-partner changes: Accor/Marriott/Qatar removed; BA/Vietnam/Finnair added at inverted 2:1.
- **HDFC Infinia** — Jan 2026 SmartBuy 5X→3X voucher cut was **rolled back**; new 2L RP/cycle redemption cap is real.
- **Flipkart Axis** — June 2025 revision: Myntra 7.5%, caps moved to ₹4,000/quarter/merchant, lounge discontinued.
- **Amazon Pay ICICI** — Jan 2026 surcharges on wallet loads, gaming, high transport/utility spend.

## Cards
- HDFC Infinia — [CardExpert](https://www.cardexpert.in/hdfc-bank-infinia-credit-card-review/), [MilesAhead](https://milesahead.club/blog/hdfc-infinia-reward-points-guide), [TechnoFino rollback thread](https://technofino.in/community/threads/rolled-back-hdfc-infinia-devaluation-reward-rate-drops-to-10-on-smartbuy-vouchers.46595/), [Live From A Lounge](https://livefromalounge.com/hdfc-infinia-smartbuy-gyftr-voucher-earning-reduced-january-2026/)
- Axis Atlas — [CardMaven](https://cardmaven.in/axis-bank-atlas-credit-card/), [RewardMatrix](https://www.rewardmatrix.in/credit-cards/reviews/axis-atlas)
- Amazon Pay ICICI — [1Finance](https://1finance.co.in/blog/amazon-pay-icici-credit-card-review/), [AngelOne 2026 rule changes](https://www.angelone.in/news/stocks/icici-bank-revises-credit-card-rules-for-2026-new-fees-reward-changes-and-discontinued-benefits)
- Flipkart Axis — [1Finance](https://1finance.co.in/blog/flipkart-axis-bank-credit-card-review-2026/), [Business Standard](https://www.business-standard.com/amp/finance/personal-finance/flipkart-axis-bank-credit-card-key-changes-in-fees-surcharges-cashback-125013100363_1.html)
- SBI Cashback — [1Finance](https://1finance.co.in/blog/sbi-cashback-credit-card-review-2026/), [Live From A Lounge](https://livefromalounge.com/sbicards-cashback-card-imposes-new-restrictions-effective-april-1-2026/)

## Valuations & transfer partners
- HDFC RP — [MilesAhead](https://milesahead.club/blog/hdfc-infinia-reward-points-guide), [CardMaven SmartBuy guide](https://cardmaven.in/hdfc-smartbuy-offers-complete-guide/), [HDFC official RP T&C (PDF)](https://www.hdfc.bank.in/content/dam/hdfcbankpws/in/en/personal-banking/discover-products/cards/credit-cards/infinia-credit-card/rewards-points-program-terms-and-conditions.pdf)
- Axis EDGE Miles — [CardExpert transfer partners](https://www.cardexpert.in/axis-points-transfer-partners/), [Magnify April 2026 changes](https://magnify.club/guides/axis-bank-transfer-partner-changes-april-2026/), [PointsMath](https://pointsmath.com/axis-bank-transfer-partners/)

## Known modelling caveats
- **Mixed date formats** in ingestion (`DD-MM-YY` from SMS vs `YYYY-MM-DD` seed data) sort lexicographically — normalize dates before production.
- **SmartBuy 15k bonus-RP/month shared cap** and **Atlas ₹2L/month travel-accelerator cap** are documented but not strictly enforced in the engine yet.
- **Flipkart per-merchant quarterly cap** is modelled as a flat cap (no quarter reset).
- Transfer-path point values are inherently ranges (depend on award redemption quality); `best` uses the optimistic end.
