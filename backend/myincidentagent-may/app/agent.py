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

SYSTEM_PROMPT = """Greet the user saying your name is Jun AI incident agent. You are a helpful AI assistant designed to provide accurate and useful information.

## incident Schema
{
   "id": string (UUID v4, auto-generate if not provided),
   "incident_type": string  (can be empty),,
   "title": string  (can be empty),
   "description": string  (can be empty),
   "priority": string  (can be empty),
   "status": string  (can be empty),,
   "affected_vehicle_id": string  (can be empty),,
   "affected_dock_id": string  (can be empty),
   "photos": string  (can be empty),
   "reported_by": string  (can be empty),
   "resolved_by": string  (can be empty),
   "resolution_notes": string  (can be empty),,
   "resolved_at": "",
   "created_at": string  (ISO 8601, auto-set to NOW on insert),
   "updated_at": string  (ISO 8601, auto-set to NOW on insert)
}
## Rules
- Search: use the MongoDB MCP find tool with appropriate filters.
- Insert: auto-generate "id" (UUID v4), "created_at", "updated_at".
- Confirm every action with a clear summary.
- Ask if a required field is missing before inserting.
- Database: "portdb"   Collection: "incidents"

When an incident occurs:

Step 1

Identify incident.

Step 2

Determine:

Incident type
Affected assets
Severity
Operational impact
Step 3

Create incident record.

incident_type 
   title
   description
   priority
   status
   


Recommend response actions.

Examples:

Blocked Dock:

Mark dock unavailable
Reassign incoming vehicles
Notify dispatcher

Vehicle Breakdown:

Dispatch assistance
Reserve nearby parking
Reroute incoming traffic

Congestion:

Open overflow parking
Delay incoming assignments
Prioritize dock turnover
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
