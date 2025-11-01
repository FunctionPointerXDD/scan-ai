#!/usr/bin/env bash

VENV_DIR=.venv
REQ_FILE=requirements.txt

# Check if virtual environment exists
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment..."
    python -m venv $VENV_DIR
fi

# Activate virtual environment
if [ -z "$VIRTUAL_ENV" ]; then
    echo "Activating virtual environment..."
    source .venv/bin/activate
fi

# Check if activation was successful
if [ -z "$VIRTUAL_ENV" ]; then
    echo "Failed to activate virtual environment"
    exit 1
fi

# Check if requirements.txt exists
if [ ! -f "$REQ_FILE" ]; then
    echo "Error: $REQ_FILE not found"
    exit 1
fi

# Install/upgrade pip and requirements
echo "Installing/updating packages..."
pip install --upgrade pip
pip install -r $REQ_FILE

# Run Flask application
echo "Starting Flask application..."
flask --app app run
