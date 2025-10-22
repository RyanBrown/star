"""Pizzaz demo MCP server implemented with the Python FastMCP helper.

The server mirrors the Node example in this repository and exposes
widget-backed tools that render the Pizzaz UI bundle. Each handler returns the
HTML shell via an MCP resource and echoes the selected topping as structured
content so the ChatGPT client can hydrate the widget. The module also wires the
handlers into an HTTP/SSE stack so you can run the server with uvicorn on port
8000, matching the Node transport behavior."""

from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List

import mcp.types as types
from mcp.server.fastmcp import FastMCP
from pydantic import BaseModel, ConfigDict, Field, ValidationError


@dataclass(frozen=True)
class PizzazWidget:
    identifier: str
    title: str
    template_uri: str
    invoking: str
    invoked: str
    html: str
    response_text: str


ASSETS_DIR = Path(__file__).resolve().parent.parent / "assets"


@lru_cache(maxsize=None)
def _load_widget_html(component_name: str) -> str:
    html_path = ASSETS_DIR / f"{component_name}.html"
    if html_path.exists():
        return html_path.read_text(encoding="utf8")

    fallback_candidates = sorted(ASSETS_DIR.glob(f"{component_name}-*.html"))
    if fallback_candidates:
        return fallback_candidates[-1].read_text(encoding="utf8")

    raise FileNotFoundError(
        f'Widget HTML for "{component_name}" not found in {ASSETS_DIR}. '
        "Run `pnpm run build` to generate the assets before starting the server."
    )


widgets: List[PizzazWidget] = [
    PizzazWidget(
        identifier="pizza-map",
        title="Show Pizza Map",
        template_uri="ui://widget/pizza-map.html",
        invoking="Hand-tossing a map",
        invoked="Served a fresh map",
        html=_load_widget_html("pizzaz"),
        response_text="Rendered a pizza map!",
    ),
    PizzazWidget(
        identifier="pizza-carousel",
        title="Show Pizza Carousel",
        template_uri="ui://widget/pizza-carousel.html",
        invoking="Carousel some spots",
        invoked="Served a fresh carousel",
        html=_load_widget_html("pizzaz-carousel"),
        response_text="Rendered a pizza carousel!",
    ),
    PizzazWidget(
        identifier="pizza-albums",
        title="Show Pizza Album",
        template_uri="ui://widget/pizza-albums.html",
        invoking="Hand-tossing an album",
        invoked="Served a fresh album",
        html=_load_widget_html("pizzaz-albums"),
        response_text="Rendered a pizza album!",
    ),
    PizzazWidget(
        identifier="pizza-list",
        title="Show Pizza List",
        template_uri="ui://widget/pizza-list.html",
        invoking="Hand-tossing a list",
        invoked="Served a fresh list",
        html=_load_widget_html("pizzaz-list"),
        response_text="Rendered a pizza list!",
    ),
    PizzazWidget(
        identifier="retirement-income-estimator",
        title="Retirement Income Estimator",
        template_uri="ui://widget/retirement-income-estimator.html",
        invoking="Preparing income estimator…",
        invoked="Retirement income estimator ready.",
        html=_load_widget_html("star"),
        response_text="Rendered retirement income estimator!",
    ),
]


MIME_TYPE = "text/html+skybridge"


WIDGETS_BY_ID: Dict[str, PizzazWidget] = {widget.identifier: widget for widget in widgets}
WIDGETS_BY_URI: Dict[str, PizzazWidget] = {widget.template_uri: widget for widget in widgets}


class PizzaInput(BaseModel):
    """Schema for pizza tools."""

    pizza_topping: str = Field(
        ...,
        alias="pizzaTopping",
        description="Topping to mention when rendering the widget.",
    )

    model_config = ConfigDict(populate_by_name=True, extra="forbid")

class RetirementIncomeEstimatorInput(BaseModel):
    """Schema for retirement estimator tool matching UI field names.

    Percent inputs are provided as fractions (e.g., 0.06 for 6%).
    """

    age: int = Field(
        ...,
        alias="age",
        description="Current age.",
        ge=0,
        le=110,
    )
    retirement_age: int = Field(
        ...,
        alias="retirementAge",
        description="Target retirement age.",
        ge=0,
        le=110,
    )
    annual_salary: float = Field(
        ...,
        alias="annualSalary",
        description="Annual salary amount.",
        ge=0,
    )
    current_savings: float = Field(
        ...,
        alias="currentSavings",
        description="Current retirement savings.",
        ge=0,
    )
    annual_contribution_pct: float = Field(
        ...,
        alias="annualContributionPct",
        description="Annual contribution as a fraction of salary (0-1).",
        ge=0,
        le=1,
    )
    employer_match: bool = Field(
        ...,
        alias="employerMatch",
        description="Whether the employer matches contributions.",
    )
    match_up_to_pct: float = Field(
        ...,
        alias="matchUpToPct",
        description="Maximum salary fraction eligible for employer match (0-1).",
        ge=0,
        le=1,
    )
    match_rate_pct: float = Field(
        ...,
        alias="matchRatePct",
        description="Employer match rate as a fraction (0-1).",
        ge=0,
        le=1,
    )
    assumed_annual_return_pct: float = Field(
        ...,
        alias="assumedAnnualReturnPct",
        description="Assumed annual return as a fraction (0-1).",
        ge=0,
        le=1,
    )

    model_config = ConfigDict(populate_by_name=True, extra="forbid")

mcp = FastMCP(
    name="pizzaz-python",
    stateless_http=True,
)


TOOL_INPUT_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "pizzaTopping": {
            "type": "string",
            "description": "Topping to mention when rendering the widget.",
        }
    },
    "required": ["pizzaTopping"],
    "additionalProperties": False,
}

RETIREMENT_TOOL_INPUT_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "age": {
            "type": "number",
            "description": "Current age.",
            "minimum": 0,
            "maximum": 110,
        },
        "retirementAge": {
            "type": "number",
            "description": "Target retirement age.",
            "minimum": 0,
            "maximum": 110,
        },
        "annualSalary": {
            "type": "number",
            "description": "Annual salary amount.",
            "minimum": 0,
        },
        "currentSavings": {
            "type": "number",
            "description": "Current retirement savings.",
            "minimum": 0,
        },
        "annualContributionPct": {
            "type": "number",
            "description": "Annual contribution as a fraction of salary (0-1).",
            "minimum": 0,
            "maximum": 1,
        },
        "employerMatch": {
            "type": "boolean",
            "description": "Whether the employer matches contributions.",
        },
        "matchUpToPct": {
            "type": "number",
            "description": "Maximum salary fraction eligible for employer match (0-1).",
            "minimum": 0,
            "maximum": 1,
        },
        "matchRatePct": {
            "type": "number",
            "description": "Employer match rate as a fraction (0-1).",
            "minimum": 0,
            "maximum": 1,
        },
        "assumedAnnualReturnPct": {
            "type": "number",
            "description": "Assumed annual return as a fraction (0-1).",
            "minimum": 0,
            "maximum": 1,
        },
    },
    "required": [
        "age",
        "retirementAge",
        "annualSalary",
        "currentSavings",
        "annualContributionPct",
        "employerMatch",
        "matchUpToPct",
        "matchRatePct",
        "assumedAnnualReturnPct",
    ],
    "additionalProperties": False,
}


def _resource_description(widget: PizzazWidget) -> str:
    return f"{widget.title} widget markup"


def _tool_meta(widget: PizzazWidget) -> Dict[str, Any]:
    return {
        "openai/outputTemplate": widget.template_uri,
        "openai/toolInvocation/invoking": widget.invoking,
        "openai/toolInvocation/invoked": widget.invoked,
        "openai/widgetAccessible": True,
        "openai/resultCanProduceWidget": True
    }


def _embedded_widget_resource(widget: PizzazWidget) -> types.EmbeddedResource:
    return types.EmbeddedResource(
        type="resource",
        resource=types.TextResourceContents(
            uri=widget.template_uri,
            mimeType=MIME_TYPE,
            text=widget.html,
            title=widget.title,
        ),
    )


@mcp._mcp_server.list_tools()
async def _list_tools() -> List[types.Tool]:
    return [
        types.Tool(
            name=widget.identifier,
            title=widget.title,
            description=widget.title,
            inputSchema=deepcopy(TOOL_INPUT_SCHEMA),
            _meta=_tool_meta(widget),
            # To disable the approval prompt for the tools
            annotations={
                "destructiveHint": False,
                "openWorldHint": False,
                "readOnlyHint": True,
            },
        )
        for widget in widgets
    ]


@mcp._mcp_server.list_resources()
async def _list_resources() -> List[types.Resource]:
    return [
        types.Resource(
            name=widget.title,
            title=widget.title,
            uri=widget.template_uri,
            description=_resource_description(widget),
            mimeType=MIME_TYPE,
            _meta=_tool_meta(widget),
        )
        for widget in widgets
    ]


@mcp._mcp_server.list_resource_templates()
async def _list_resource_templates() -> List[types.ResourceTemplate]:
    return [
        types.ResourceTemplate(
            name=widget.title,
            title=widget.title,
            uriTemplate=widget.template_uri,
            description=_resource_description(widget),
            mimeType=MIME_TYPE,
            _meta=_tool_meta(widget),
        )
        for widget in widgets
    ]


async def _handle_read_resource(req: types.ReadResourceRequest) -> types.ServerResult:
    widget = WIDGETS_BY_URI.get(str(req.params.uri))
    if widget is None:
        return types.ServerResult(
            types.ReadResourceResult(
                contents=[],
                _meta={"error": f"Unknown resource: {req.params.uri}"},
            )
        )

    contents = [
        types.TextResourceContents(
            uri=widget.template_uri,
            mimeType=MIME_TYPE,
            text=widget.html,
            _meta=_tool_meta(widget),
        )
    ]

    return types.ServerResult(types.ReadResourceResult(contents=contents))


async def _call_tool_request(req: types.CallToolRequest) -> types.ServerResult:
    # Handle retirement estimator tool separately
    if req.params.name == "estimate_retirement":
        arguments = req.params.arguments or {}
        try:
            payload = RetirementIncomeEstimatorInput.model_validate(arguments)
        except ValidationError as exc:
            return types.ServerResult(
                types.CallToolResult(
                    content=[
                        types.TextContent(
                            type="text",
                            text=f"Input validation error: {exc.errors()}",
                        )
                    ],
                    isError=True,
                )
            )

        # Compute estimate mirroring mock-estimate.mts
        age = int(payload.age)
        retirement_age = int(payload.retirement_age)
        annual_salary = float(payload.annual_salary)
        current_savings = max(0.0, float(payload.current_savings))
        contrib_pct = max(0.0, float(payload.annual_contribution_pct))
        employer_match = bool(payload.employer_match)
        match_up_to_pct = max(0.0, float(payload.match_up_to_pct))
        match_rate_pct = max(0.0, float(payload.match_rate_pct))
        annual_return = max(0.0, float(payload.assumed_annual_return_pct))

        years = max(0, round(retirement_age - age))
        start = current_savings
        total_employee_contrib = 0.0
        total_employer_match = 0.0
        points: List[Dict[str, Any]] = []

        for i in range(years):
            year = i + 1
            age_this_year = age + year
            employee_contribution = max(0.0, annual_salary * contrib_pct)
            capped_pct = min(contrib_pct, match_up_to_pct)
            employer_base = max(0.0, annual_salary * capped_pct)
            employer = employer_base * match_rate_pct if employer_match else 0.0
            growth = max(0.0, (start + employee_contribution + employer) * annual_return)
            end_balance = start + employee_contribution + employer + growth

            points.append(
                {
                    "year": year,
                    "age": age_this_year,
                    "startBalance": int(round(start)),
                    "employeeContribution": int(round(employee_contribution)),
                    "employerMatch": int(round(employer)),
                    "growth": int(round(growth)),
                    "endBalance": int(round(end_balance)),
                }
            )

            total_employee_contrib += employee_contribution
            total_employer_match += employer
            start = end_balance

        summary = {
            "years": years,
            "endingBalance": int(round(start)),
            "totalEmployeeContrib": int(round(total_employee_contrib)),
            "totalEmployerMatch": int(round(total_employer_match)),
        }

        star_widget = WIDGETS_BY_ID.get("retirement-income-estimator") or widgets[4]
        widget_resource = _embedded_widget_resource(star_widget)
        meta: Dict[str, Any] = {
            "openai.com/widget": widget_resource.model_dump(mode="json"),
            "openai/outputTemplate": star_widget.template_uri,
            "openai/toolInvocation/invoking": star_widget.invoking,
            "openai/toolInvocation/invoked": star_widget.invoked,
            "openai/widgetAccessible": True,
            "openai/resultCanProduceWidget": True,
        }

        return types.ServerResult(
            types.CallToolResult(
                content=[
                    types.TextContent(
                        type="text",
                        text=star_widget.response_text,
                    )
                ],
                structuredContent={"summary": summary, "points": points},
                _meta=meta,
            )
        )

    # Default: treat as a pizza widget tool
    widget = WIDGETS_BY_ID.get(req.params.name)
    if widget is None:
        return types.ServerResult(
            types.CallToolResult(
                content=[
                    types.TextContent(
                        type="text",
                        text=f"Unknown tool: {req.params.name}",
                    )
                ],
                isError=True,
            )
        )

    arguments = req.params.arguments or {}
    try:
        payload = PizzaInput.model_validate(arguments)
    except ValidationError as exc:
        return types.ServerResult(
            types.CallToolResult(
                content=[
                    types.TextContent(
                        type="text",
                        text=f"Input validation error: {exc.errors()}",
                    )
                ],
                isError=True,
            )
        )

    topping = payload.pizza_topping
    widget_resource = _embedded_widget_resource(widget)
    meta: Dict[str, Any] = {
        "openai.com/widget": widget_resource.model_dump(mode="json"),
        "openai/outputTemplate": widget.template_uri,
        "openai/toolInvocation/invoking": widget.invoking,
        "openai/toolInvocation/invoked": widget.invoked,
        "openai/widgetAccessible": True,
        "openai/resultCanProduceWidget": True,
    }

    return types.ServerResult(
        types.CallToolResult(
            content=[
                types.TextContent(
                    type="text",
                    text=widget.response_text,
                )
            ],
            structuredContent={"pizzaTopping": topping},
            _meta=meta
        )
    )


mcp._mcp_server.request_handlers[types.CallToolRequest] = _call_tool_request
mcp._mcp_server.request_handlers[types.ReadResourceRequest] = _handle_read_resource


app = mcp.streamable_http_app()

try:
    from starlette.middleware.cors import CORSMiddleware

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
        allow_credentials=False,
    )
except Exception:
    pass


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000)
