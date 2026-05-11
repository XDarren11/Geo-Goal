from __future__ import annotations

import argparse
import os

try:
	from dotenv import load_dotenv

	load_dotenv()
except Exception:
	pass

from m2m_client import M2MClient
from api_client import APIClient


def main() -> None:
	parser = argparse.ArgumentParser()
	parser.add_argument("--match-analytics", type=int, help="match id to fetch analytics")
	parser.add_argument("--match-detail", type=int, help="match id to fetch detail")
	parser.add_argument("--check-connection", action="store_true", help="only verify connection by obtaining an M2M token")
	args = parser.parse_args()

	API_BASE = os.environ.get("GEO_API_URL") or "http://localhost:3000/api"
	CLIENT_ID = os.environ.get("M2M_CLIENT_ID")
	CLIENT_SECRET = os.environ.get("M2M_CLIENT_SECRET")

	if not CLIENT_ID or not CLIENT_SECRET:
		print("Please set M2M_CLIENT_ID and M2M_CLIENT_SECRET in the environment.")
		raise SystemExit(2)

	m2m = M2MClient(API_BASE, CLIENT_ID, CLIENT_SECRET)
	api = APIClient(API_BASE, m2m)

	if args.check_connection:
		try:
			token = m2m.get_token()
			print("Connection OK — token fetched (length:", len(token), ")")
		except Exception as e:
			print("Connection failed:", str(e))
		return

	if args.match_analytics:
		print(api.get_match_analytics(args.match_analytics))
	if args.match_detail:
		print(api.get_match_detail(args.match_detail))


if __name__ == "__main__":
	main()
