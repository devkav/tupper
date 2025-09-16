const componentProperties = {}


async function loadImports() {
  const importObjects = document.querySelectorAll("import");
  const importPromises = Array.from(importObjects).map(importObject => 
    fetch(importObject.getAttribute("src"), {
      headers: {
        "Accept": "text/plain",
        "Content-Type": "text/plain"
      }
    }).then(
      response => response.text().then(
        data => {
          document.body.innerHTML += data;
        }
      )
    )
  )

  await Promise.all(importPromises)
}


function loadComponents() {
  const components = document.querySelectorAll("comp");

  components.forEach(component => {
    const attributes = component.getAttributeNames();
    const componentName = attributes[0];

    if (component.children.length > 1) {
      throw "Component must only have 1 child";
    } else if (component.children.length == 0) {
      throw "Component must have a child";
    }

    const params = Array.from(attributes).slice(1).reduce((acc, attribute) => {
      acc[attribute] = component.getAttribute(attribute);
      return acc;
    }, {});

    componentProperties[componentName] = {
      DOM: component.children[0],
      params,
    };

    component.remove();
  });
}


function renderDescendantComponents(instance) {
  const componentName = instance.tagName.toLowerCase();
  if (componentName in componentProperties) {
    renderComponent(instance);
  } else {
    Array.from(instance.children).forEach(child => renderDescendantComponents(child))
  }
}


function renderComponent(instance) {
  const componentName = instance.tagName.toLowerCase();
  const component = componentProperties[componentName];
  const instanceParamValues = Array.from(instance.getAttributeNames()).reduce((acc, attribute) => {
    if (attribute in component.params) {
      acc[attribute] = instance.getAttribute(attribute);
    }

    return acc;
  }, {});

  const domClone = component.DOM.cloneNode(true);

  Object.keys(component.params).forEach(paramName => {
    const regex = new RegExp(`\\$${paramName}`, 'ig');
    domClone.innerHTML = domClone.innerHTML.replace(
      regex,
      paramName in instanceParamValues ? instanceParamValues[paramName] : component.params[paramName]
    )
  })

  Array.from(domClone.children).forEach(child => {
    renderDescendantComponents(child)
  })

  instance.replaceWith(domClone);
}

function renderComponents() {
  Object.keys(componentProperties).forEach(componentName => {
    const instances = document.querySelectorAll(componentName);

    instances.forEach(instance => {
      renderComponent(instance)
    })
  })
}


document.onreadystatechange = async function(e) {
  if (document.readyState === 'complete') {
    await loadImports();
    loadComponents();
    renderComponents()
  }
}
