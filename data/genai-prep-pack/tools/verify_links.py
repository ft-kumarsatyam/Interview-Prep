"""Check every URL in resources.json (and plan.json links) and write link_report.json.

Run on your own machine or in CI (it needs normal internet access):
    python verify_links.py ../resources.json link_report.json

YouTube watch links are checked through the public oEmbed endpoint. Other pages
are fetched with a browser-like user agent. 401/403/429 are reported as
"blocked" (the site refuses bots; open those links by hand). 404/410 are "dead".
"""
import json, sys, urllib.request, urllib.error, urllib.parse
from concurrent.futures import ThreadPoolExecutor

src = sys.argv[1] if len(sys.argv) > 1 else "../resources.json"
out = sys.argv[2] if len(sys.argv) > 2 else "link_report.json"
data = json.load(open(src, encoding="utf-8"))
items = data["resources"] if isinstance(data, dict) and "resources" in data else data
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            return r.status, r.geturl(), r.read(2000)
    except urllib.error.HTTPError as e:
        return e.code, url, b""
    except Exception as e:
        return 0, url, str(e).encode()[:120]


def check(item):
    url = item["url"]
    res = dict(id=item["id"], url=url, title=item.get("title"))
    if "youtube.com/watch" in url:
        o = "https://www.youtube.com/oembed?format=json&url=" + urllib.parse.quote(url, safe="")
        code, _, body = fetch(o)
        if code == 200:
            d = json.loads(body.decode("utf-8", "ignore") or "{}") if len(body) < 2000 else {}
            res.update(status="ok", detail="oembed ok")
        elif code in (400, 404):
            res.update(status="dead", detail="oembed %d" % code)
        else:
            res.update(status="unknown", detail="oembed %d" % code)
        return res
    code, final, body = fetch(url)
    if code == 0:
        res.update(status="unreachable", detail=body.decode("utf-8", "ignore"))
    elif 200 <= code < 400:
        res.update(status="ok", detail=str(code))
    elif code in (401, 403, 429, 451, 999):
        res.update(status="blocked", detail=str(code))
    elif code in (404, 410):
        res.update(status="dead", detail=str(code))
    else:
        res.update(status="other", detail=str(code))
    if final != url:
        res["final_url"] = final
    return res


with ThreadPoolExecutor(max_workers=12) as ex:
    report = list(ex.map(check, items))
json.dump(report, open(out, "w"), indent=1, ensure_ascii=False)
from collections import Counter
print(Counter(r["status"] for r in report))
for r in report:
    if r["status"] not in ("ok",):
        print(r["status"], r["id"], r["url"], r.get("detail", ""))
