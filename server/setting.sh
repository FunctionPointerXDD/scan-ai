sudo apt install python3.12-venv
sudo snap install ollama
mkdir -p ~/models/my_gguf_model

mv /model-Q5_K_M.gguf ~/models/my_gguf_model/

cat > ~/models/my_gguf_model/Modelfile <<'EOF'
FROM ./model-Q5_K_M.gguf
EOF

ollama create my_gguf_model -f ~/models/my_gguf_model/Modelfile
ollama run my_gguf_model
