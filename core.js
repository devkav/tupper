const componentProperties = {}


async function loadImports() {
  const importObjects = document.querySelectorAll("import");
  const importPromises = Array.from(importObjects).map(importObject => 
    fetch(importObject.getAttribute("src")).then(
      response => response.text().then(
        data => {
          document.body.innerHTML += data;
        }
      )
    )
  )

  await Promise.all(importPromises)
}


function getComponentDependencies(element, componentNames, dependencies=new Set()) {
  Array.from(element.children).forEach(child => {
    const childName = child.tagName.toLowerCase();

    if (componentNames.has(childName)) {
      dependencies.add(childName);
    }

    getComponentDependencies(child, componentNames, dependencies);
  })

  return dependencies;
}


function resolveTemplate(target) {
  Array.from(target.children).forEach(child => {
    instanceType = child.tagName.toLowerCase();

    if (instanceType in componentProperties) {
      const domClone = componentProperties[instanceType].DOM.cloneNode(true);
      child.replaceWith(domClone);
    }

    resolveTemplate(child);
  })

  return target;
}


function resolveDOMDependencies(componentName, visited=new Set()) {
  if (componentName in visited) {
    throw "Circular dependency detected"
  }

  visited.add(componentName)
  const dependencies = componentProperties[componentName].dependencies;

  dependencies.forEach(dependencyName => {
    if (componentProperties[dependencyName].DOM == null) {
      resolveDOMDependencies(dependencyName, visited);
    }
  })

  const templateDOM = componentProperties[componentName].template.cloneNode(true)
  const resolvedDOM = resolveTemplate(templateDOM);
  componentProperties[componentName].DOM = resolvedDOM.children[0]; // Remove the comp wrapper
}


function loadComponents() {
  const components = document.querySelectorAll("comp");
  const componentNames = new Set(Array.from(components).map(component => component.getAttributeNames()[0]));
  const needsResolved = [];

  // Get as much information as we can about a component. If it has dependencies on other components, wait to set the DOM
  components.forEach(component => {
    const dependencies = getComponentDependencies(component, componentNames);
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
      DOM: dependencies.size == 0 ? component.children[0] : null,
      params,
      dependencies,
      template: component
    };

    if (dependencies.size > 0) {{
      needsResolved.push(componentName);
    }}

    component.remove();
  });

  needsResolved.forEach(componentName => resolveDOMDependencies(componentName))
}


function renderComponents() {
  Object.keys(componentProperties).forEach(componentName => {
    const component = componentProperties[componentName];
    const instances = document.querySelectorAll(componentName);

    instances.forEach(instance => {
      const instanceParamValues = Array.from(instance.getAttributeNames()).reduce((acc, attribute) => {
        if (attribute in component.params) {
          acc[attribute] = instance.getAttribute(attribute);
        }

        return acc;
      }, {});

      const domClone = component.DOM.cloneNode(true);
      instance.replaceWith(domClone);

      Object.keys(component.params).forEach(paramName => {
        const regex = new RegExp(`\\$${paramName}`, 'ig');
        domClone.innerHTML = domClone.innerHTML.replace(
          regex,
          paramName in instanceParamValues ? instanceParamValues[paramName] : component.params[paramName]
        )
      })
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
