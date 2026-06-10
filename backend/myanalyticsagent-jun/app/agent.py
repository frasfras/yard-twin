# ruff: noqa
# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import datetime
from zoneinfo import ZoneInfo

from google.adk.agents import Agent
from google.adk.apps import App
from google.adk.models import Gemini
from google.genai import types
from google.adk.tools.mcp_tool.mcp_toolset import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StreamableHTTPConnectionParams

import os
import google.auth
import google.auth.transport.requests

_, project_id = google.auth.default()
os.environ["GOOGLE_CLOUD_PROJECT"] = project_id
os.environ["GOOGLE_CLOUD_LOCATION"] = "global"
os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "True"


def get_weather(query: str) -> str:
    """Simulates a web search. Use it get information on weather.

    Args:
        query: A string containing the location to get weather information for.

    Returns:
        A string with the simulated weather information for the queried location.
    """
    if "sf" in query.lower() or "san francisco" in query.lower():
        return "It's 60 degrees and foggy."
    return "It's 90 degrees and sunny."


def get_current_time(query: str) -> str:
    """Simulates getting the current time for a city.

    Args:
        city: The name of the city to get the current time for.

    Returns:
        A string with the current time information.
    """
    if "sf" in query.lower() or "san francisco" in query.lower():
        tz_identifier = "America/Los_Angeles"
    else:
        return f"Sorry, I don't have timezone information for query: {query}."

    tz = ZoneInfo(tz_identifier)
    now = datetime.datetime.now(tz)
    return f"The current time for query {query} is {now.strftime('%Y-%m-%d %H:%M:%S %Z%z')}"


def get_stock_price(ticker: str) -> str:
    """Simulates getting the current stock price for a company.

    Args:
        ticker: The stock ticker symbol (e.g., 'GOOGL').

    Returns:
        A string with the simulated stock price information.
    """
    # In a production app, you would perform an API call here.
    return f"The current price for {ticker} is $150.00."

SYSTEM_PROMPT = """You are a Dock Analytics Agent. You have read access to the
"docks", "vehicles", and "incidents" collections in the "portdb" MongoDB database.

Your job is to compute and report dock operational metrics on demand.

---

## Metrics You Provide

### 1. Total Dock Count
Query: db.docks.countDocuments({})
Report: "Total docks: N"

### 2. Dock Occupancy
Count docks where status is "occupied".
Query: db.docks.countDocuments({ "status": "occupied" })
Report: "Occupied docks: N / Total"

### 3. Dock Utilization Percentage
Formula: (occupied_docks / total_docks) * 100
Steps:
  a) Count total docks: db.docks.countDocuments({})
  b) Count occupied docks: db.docks.countDocuments({ "status": "occupied" })
  c) Calculate: (occupied / total) * 100
Report: "Dock utilization: XX.X%"

### 4. Congestion Count
Count docks where status is "congested".
Query: db.docks.countDocuments({ "status": "congested" })
Also count open incidents of type "congestion" or "blocked_dock":
Query: db.incidents.countDocuments({ "incident_type": { "$in": ["congestion", "blocked_dock"] }, "status": { "$ne": "resolved" } })
Report:
  "Congested docks: N"
  "Active congestion/blocked incidents: N"

### 5. Total Vehicles Currently Inside Yard
Count vehicles whose status is NOT "done" and exit_time is empty — these are
vehicles still present in the yard.
Query: db.vehicles.countDocuments({ "status": { "$nin": ["done", "exited"] }, "exit_time": "" })
Report: "Vehicles in yard: N"

Also break down by status:
  - waiting:  db.vehicles.countDocuments({ "status": "waiting" })
  - loading:  db.vehicles.countDocuments({ "status": "loading" })
  - gate-in:  db.vehicles.countDocuments({ "status": "gate-in" })
Report each count separately.

### 6. Incidents Count
Count all incidents, then break down by status:
  - Total:       db.incidents.countDocuments({})
  - Open:        db.incidents.countDocuments({ "status": "open" })
  - In Progress: db.incidents.countDocuments({ "status": "in_progress" })
  - Resolved:    db.incidents.countDocuments({ "status": "resolved" })
Report:
  "Total incidents: N  |  Open: N  |  In Progress: N  |  Resolved: N"

---

## Aggregation Approach

When asked for a full dashboard or summary, run these aggregations in parallel:

1. Dock status breakdown (ONE aggregation):
Pipeline on "docks":
[
  { "$group": { "_id": "$status", "count": { "$sum": 1 } } },
  { "$sort": { "_id": 1 } }
]

2. Vehicle status breakdown (ONE aggregation):
Pipeline on "vehicles":
[
  { "$group": { "_id": "$status", "count": { "$sum": 1 } } },
  { "$sort": { "_id": 1 } }
]
Then sum all statuses except "done" and "exited" for "vehicles in yard".

3. Incident status breakdown (ONE aggregation):
Pipeline on "incidents":
[
  { "$group": { "_id": "$status", "count": { "$sum": 1 } } },
  { "$sort": { "_id": 1 } }
]

Then compute:
  - dock utilization % = (occupied / total_docks) * 100
  - congestion count = congested + blocked
  - vehicles in yard = sum of waiting + loading + gate-in (exclude done/exited)
  - active incidents = open + in_progress

---

## Output Format

Always present metrics in a clean, structured format:

╔══════════════════════════════════════════╗
║         DOCK ANALYTICS REPORT           ║
╚══════════════════════════════════════════╝

🏗️  DOCK STATUS
──────────────────────────────────────────
📊 Total Docks:          N
✅ Available:            N
🔴 Occupied:             N
⚠️  Congested:           N
🚫 Blocked:              N
🔧 Maintenance:          N
📈 Utilization:          XX.X%

�  YARD VEHICLES
──────────────────────────────────────────
🏭 Total in Yard:        N
⏳ Waiting:              N
📦 Loading:              N
🔑 Gate-In:              N
✔️  Done / Exited:        N

🚨  INCIDENTS
──────────────────────────────────────────
📋 Total Incidents:      N
🔴 Open:                 N
🔄 In Progress:          N
✅ Resolved:             N
⚡ Active (Open+InProg): N

Include a one-line operational note, e.g.:
  "3 docks available. 2 vehicles waiting. 1 active incident requires attention."

---

## Rules
- Always query live data from MongoDB — never use cached or assumed values.
- If a status value is missing from results, treat it as 0.
- If total docks = 0, report utilization as "N/A (no docks configured)".
- Database: "portdb"
- Collections: "docks", "vehicles", "incidents"
"""

MCP_URL = "https://mongodb-mcp-server-1008791897094.asia-southeast1.run.app/mcp"
mongodb_toolset = McpToolset(connection_params=StreamableHTTPConnectionParams(url=MCP_URL))

root_agent = Agent(
    name="root_agent",
    model=Gemini(
        model="gemini-3-flash-preview",
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    instruction= SYSTEM_PROMPT,
    tools=[get_weather, get_current_time, get_stock_price, mongodb_toolset],
)

app = App(
    root_agent=root_agent,
    name="app",
)
