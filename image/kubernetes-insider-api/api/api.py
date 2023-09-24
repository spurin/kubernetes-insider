#!/usr/venv/bin/python

import uvicorn
import multiprocessing

if __name__ == "__main__":
    multiprocessing.freeze_support()
    uvicorn.run("main:app", host='0.0.0.0', port=8000, workers=1, reload=True, log_level='debug')
