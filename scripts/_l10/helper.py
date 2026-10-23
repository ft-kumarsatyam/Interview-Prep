"""Builders for Level 10 study notes. Not shipped."""


def note(
    what: str,
    why: str,
    how: str,
    fails: str,
    line: str,
    walk: str,
    follow: str,
    measure: str,
    kps: list[str],
    qs: list[dict],
    links: list[dict] | None = None,
) -> dict:
    explain = (
        f"## What it is\n\n{what.strip()}\n\n"
        f"## Why it matters on the job and in an interview\n\n{why.strip()}\n\n"
        f"## How it works + one small example\n\n{how.strip()}\n\n"
        f"## Failure modes\n\n{fails.strip()}\n\n"
        f"## What you would say in 30 seconds\n\n{line.strip()}\n\n"
        f"## A concrete walk-through\n\n{walk.strip()}\n\n"
        f"## Interview follow-up\n\n{follow.strip()}\n\n"
        f"## What I would measure\n\n{measure.strip()}\n"
    )
    return {
        "explain": explain,
        "keyPoints": kps,
        "questions": qs,
        "links": links or [],
    }


MLFLOW = {"title": "MLflow: LLM tracking", "url": "https://mlflow.org/docs/latest/llms/index.html"}
LANGFUSE = {"title": "Langfuse docs", "url": "https://langfuse.com/docs"}
DEEPEVAL = {"title": "DeepEval getting started", "url": "https://www.deepeval.com/docs/getting-started"}
FASTAPI = {"title": "FastAPI documentation", "url": "https://fastapi.tiangolo.com/"}
DOCKER = {"title": "Docker get started", "url": "https://docs.docker.com/get-started/"}
GHA = {"title": "GitHub Actions: understanding workflows", "url": "https://docs.github.com/en/actions/learn-github-actions/understanding-github-actions"}
GHA_OIDC = {
    "title": "GitHub Actions: OpenID Connect",
    "url": "https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect",
}
EC2_IAM = {
    "title": "AWS: IAM roles for EC2",
    "url": "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/iam-roles-for-amazon-ec2.html",
}
SECRETS = {
    "title": "AWS Secrets Manager",
    "url": "https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html",
}
CODEDEPLOY = {
    "title": "AWS CodeDeploy",
    "url": "https://docs.aws.amazon.com/codedeploy/latest/userguide/welcome.html",
}
ASG = {
    "title": "AWS Auto Scaling groups",
    "url": "https://docs.aws.amazon.com/autoscaling/ec2/userguide/auto-scaling-groups.html",
}
PROM = {"title": "Prometheus overview", "url": "https://prometheus.io/docs/introduction/overview/"}
GRAFANA = {"title": "Grafana documentation", "url": "https://grafana.com/docs/grafana/latest/"}
NEMO = {"title": "NeMo Guardrails", "url": "https://docs.nvidia.com/nemo/guardrails/latest/index.html"}
GUARDRAILS = {"title": "Guardrails AI docs", "url": "https://www.guardrailsai.com/docs"}
STRUCTURED = {
    "title": "OpenAI: structured outputs",
    "url": "https://platform.openai.com/docs/guides/structured-outputs",
}
SSE = {
    "title": "MDN: Server-sent events",
    "url": "https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events",
}
