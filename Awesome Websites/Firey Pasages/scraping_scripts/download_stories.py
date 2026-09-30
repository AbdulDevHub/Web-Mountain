import os
import re
import json
import time
import requests
from bs4 import BeautifulSoup

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

AUTHOR_WORKS_URL = "https://www.website.com/authors/Name"
OUTPUT_DIR = "Stories"

def sanitize_filename(name):
    """Remove illegal filesystem characters."""
    return re.sub(r'[\\/*?:"<>|]', "", name).strip()

def clean_text(text):
    """Clean up raw carriage returns and string escapes from JavaScript/JSON string payloads."""
    if not text:
        return ""
    # Normalize newline escapes and carriage returns
    text = text.replace('\\r\\n', '\n').replace('\r\n', '\n').replace('\r', '\n')
    text = text.replace('\\n', '\n').replace('\\t', '\t')
    # Unescape escaped quotes
    text = text.replace('\\"', '"').replace("\\'", "'")
    return text.strip()

def extract_json_data(html):
    """Extract embedded React/Next.js JSON data payload from HTML script tags."""
    soup = BeautifulSoup(html, 'html.parser')
    scripts = soup.find_all('script')

    for script in scripts:
        if script.string:
            # Look for story data structures containing pageText or pages_count
            if 'pageText' in script.string or 'pages_count' in script.string:
                return script.string
    return None

def get_story_links(works_url):
    """Fetch all story URLs from the author's page."""
    print(f"Fetching story list from {works_url}...")
    response = requests.get(works_url, headers=HEADERS)
    if response.status_code != 200:
        print(f"Failed to load author page. Status: {response.status_code}")
        return []

    soup = BeautifulSoup(response.text, 'html.parser')
    story_links = set()

    for a_tag in soup.find_all('a', href=True):
        href = a_tag['href']
        # Filter for story links (e.g., https://www.website.com/s/title-of-story)
        if '/s/' in href:
            # Clean off any query strings or page parameters
            base_url = href.split('?')[0]
            if not base_url.startswith('http'):
                base_url = "https://www.website.com" + base_url
            story_links.add(base_url)

    story_list = sorted(list(story_links))
    print(f"Found {len(story_list)} unique stories.")
    return story_list

def parse_page_data(html):
    """Extract pageText, total pages count, title, and description from embedded script data or fallback HTML."""
    script_content = extract_json_data(html)

    page_text = ""
    pages_count = 1
    title = ""
    description = ""

    if script_content:
        # Extract pageText using regex from embedded JS data
        match_text = re.search(r'pageText:\s*"(.*?)"\s*(?:,|\})', script_content, re.DOTALL)
        if match_text:
            page_text = clean_text(match_text.group(1))

        # Extract total page count
        match_pages = re.search(r'pages_count:\s*(\d+)', script_content)
        if match_pages:
            pages_count = int(match_pages.group(1))

        # Extract title
        match_title = re.search(r'title:\s*"(.*?)"\s*(?:,|\})', script_content)
        if match_title:
            title = clean_text(match_title.group(1))

        # Extract description
        match_desc = re.search(r'description:\s*"(.*?)"\s*(?:,|\})', script_content)
        if match_desc:
            description = clean_text(match_desc.group(1))

    # Fallback to standard DOM extraction if JSON extraction came up empty
    if not page_text:
        soup = BeautifulSoup(html, 'html.parser')

        if not title:
            h1 = soup.find('h1')
            title = h1.get_text(strip=True) if h1 else "Untitled"

        content_div = soup.find('div', class_='aa_ht') or soup.find('div', class_='b-story-body-span')
        if content_div:
            page_text = content_div.get_text(separator="\n\n", strip=True)

    return title, description, page_text, pages_count

def download_story(story_url):
    """Loop through all pages of a story and combine them into one text file payload."""
    # Step 1: Fetch Page 1
    first_page_res = requests.get(story_url, headers=HEADERS)
    if first_page_res.status_code != 200:
        raise Exception(f"Failed to fetch page 1 (Status {first_page_res.status_code})")

    title, description, page_1_text, total_pages = parse_page_data(first_page_res.text)

    all_pages = [page_1_text]
    print(f" -> Story: '{title}' ({total_pages} total page(s))")

    # Step 2: Fetch Pages 2 through total_pages
    for page_num in range(2, total_pages + 1):
        page_url = f"{story_url}?page={page_num}"
        print(f"    Fetching page {page_num}/{total_pages}...")

        res = requests.get(page_url, headers=HEADERS)
        if res.status_code == 200:
            _, _, p_text, _ = parse_page_data(res.text)
            if p_text:
                all_pages.append(p_text)
            else:
                print(f"    Warning: Could not extract text for page {page_num}")
        else:
            print(f"    Error fetching page {page_num}: Status {res.status_code}")

        time.sleep(1) # Be polite to server rate limits

    full_story_body = "\n\n".join(all_pages)
    return title, description, full_story_body

def main():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    story_links = get_story_links(AUTHOR_WORKS_URL)

    for idx, link in enumerate(story_links, start=1):
        print(f"\n[{idx}/{len(story_links)}] Processing: {link}")
        try:
            title, description, content = download_story(link)

            safe_title = title if title else link.split('/')[-1]
            filename = sanitize_filename(safe_title) + ".txt"
            filepath = os.path.join(OUTPUT_DIR, filename)

            # Construct header with Title and Description as requested
            header = f"Title: {title}\n"
            if description:
                header += f"Description: {description}\n"
            header += f"URL: {link}\n"
            header += "=" * 50 + "\n\n"

            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(header + content)

            print(f"Saved: {filename}")
        except Exception as e:
            print(f"Error downloading {link}: {e}")

        time.sleep(1.5)

    print(f"\nFinished! All stories saved to folder: '{OUTPUT_DIR}'")

if __name__ == "__main__":
    main()