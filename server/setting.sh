sudo apt install python3.12-venv
sudo snap install ollama
mkdir -p ~/models/my_gguf_model

mv /model-Q5_K_M.gguf ~/models/my_gguf_model/

cat > ~/models/my_gguf_model/Modelfile <<'EOF'
FROM ./model.gguf
# 선택: 문맥창, 로프스케일 등
# PARAMETER num_ctx 4096
# PARAMETER rope_frequency_base 1e6
# 선택: 프롬프트 템플릿 지정
# TEMPLATE "{{ .System }}\n{{ .Prompt }}"
EOF

ollama create my_gguf_model -f ~/models/my_gguf_model/Modelfile
ollama run my_gguf_model
