# Abonelik Model Seçici

Claude, ChatGPT, Gemini, DeepSeek ve OpenCode Go aboneliklerindeki modelleri zeka, görev başı maliyet ve hıza göre sıralayan tek sayfalık araç. Artificial Analysis verisini LiveBench, LMArena ve Vals Index ile karşılaştırır.

- `index.html`: sayfa. `data.json` dosyasını okur.
- `data.json`: tüm veriler. Her sabah bulutta çalışan bir Claude görevi tarafından güncellenir.
- `UPDATE.md`: o görevin talimatı.
- `scripts/validate.mjs`: `data.json` kontrolü. `scripts/sync-seed.mjs`: veriyi sayfanın içine de kopyalar. `scripts/render.mjs`: JavaScript ile çizilen sayfaları okumak için.

Veriler kendi kaynaklarına aittir: [Artificial Analysis](https://artificialanalysis.ai), [LiveBench](https://livebench.ai), [LMArena](https://arena.ai), [Vals AI](https://www.vals.ai), [OpenCode](https://opencode.ai).
