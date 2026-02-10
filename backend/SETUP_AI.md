# AI Classification Setup

## OpenAI API Key Required

To enable AI image classification for closet items, you need to add your OpenAI API key.

### Steps:

1. Get your API key from https://platform.openai.com/api-keys

2. Add it to your `.env` file in the backend folder:
   ```
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

3. Restart the backend server:
   ```bash
   npm run dev
   ```

## How It Works

When a user uploads a closet item:

1. **Image Analysis**: OpenAI Vision (GPT-4o-mini) analyzes the image
2. **Auto-Detection**:
   - Category (tops, bottoms, dresses, etc.)
   - Subcategory (blouse, jeans, sneakers, etc.)
   - Primary color and secondary colors
   - Pattern (solid, striped, floral, etc.)
   - Neckline type
   - Sleeve length
   - Fit type (fitted, relaxed, oversized)
   - Fabric texture
   - Style (casual, formal, sporty, etc.)
3. **Auto-Tagging**: Generates relevant tags from detected attributes
4. **Season Suggestions**: Suggests appropriate seasons based on fabric and style
5. **Confidence Score**: Returns AI confidence level (0-1)

## Manual Override

Users can still manually select category and color. The AI will:
- Fill in missing fields automatically
- Allow manual corrections
- Store AI confidence score for reference

## Cost Estimate

- Model: gpt-4o-mini (vision)
- Cost: ~$0.01 per image analysis
- Very affordable for production use

## Fallback

If AI classification fails:
- Uses manual user input
- Continues with default values
- No error shown to user
