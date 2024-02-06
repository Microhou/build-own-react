// const element = (
//     <div id="foo">
//       <a>bar</a>
//       <b />
//     </div>
//   )
let a = 1;
let b = 2;
function createElement(type, props, ...children) {
    return {
        type,
        props: {
            ...props,
            children: children.map(child =>
              typeof child === 'object'
              ? child
              : createTextElement(child)
            )
        }
    }
}

function createTextElement(text) {
  
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: []
    }
  }
}
const obj = createElement("div", null, a, b);
console.log(obj);

const nextObj = createElement("div", null);
console.log("no",nextObj);

function render(element, container) {
  const dom = element.type == "TEXT_ELEMENT" ? document.createTextNode("") : document.createElement(element.type);
  const isProperty = key => key !== "children";
  Object.keys(element.props)
  .filter(isProperty)
  .forEach(name => {
    dom[name] = element.props[name];
  })
  element.props.children.forEach(child => {
    return render(child, dom);
  });
  container.appendChild(dom);
}

