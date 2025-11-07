import magic 
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pathlib import Path


app = FastAPI()
mime = magic.Magic(mime=True)
current_directory = Path(__file__).parent
root_directory = current_directory.parent.parent
src_directory = root_directory.joinpath("src")
web_directory = current_directory.joinpath("web")


def get_media_type(extension):
    match extension:
        case ".html":
            return "text/html"
        case ".css":
            return "text/css"
        case ".js":
            return "text/javascript"
        case _:
            return "text/plain"


@app.get("/{resource_path:path}")
def read_root(resource_path):
    if resource_path == "":
        resource_path = "index.html"

    if resource_path == "core.js":
        resource_parent_directory = src_directory
    else:
        resource_parent_directory = web_directory

    resource = resource_parent_directory.joinpath(resource_path)

    if not resource.is_file():
        return HTTPException(status_code=404)

    with open(str(resource)) as file:
        content = file.read()
        media_type = get_media_type(resource.suffix)

        return Response(content=content, media_type=media_type)
