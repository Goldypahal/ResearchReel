import os
from pathlib import Path

import yaml

# configs/prompts next to the app package, independent of the working directory.
DEFAULT_PROMPTS_DIR = str(Path(__file__).resolve().parents[2] / "configs" / "prompts")


class PromptLoader:
    def __init__(self, prompts_dir: str = DEFAULT_PROMPTS_DIR):
        self.prompts_dir = prompts_dir

    def load_prompt(self, name: str, version: str = "v1") -> str:
        path = os.path.join(self.prompts_dir, f"{name}_{version}.yaml")
        if not os.path.exists(path):
            raise FileNotFoundError(f"Prompt {name} {version} not found.")
        
        with open(path, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)
            return config['template']
