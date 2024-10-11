let tags = ["Linux", "VM", "Annet"];
const resultBox = document.querySelector(".result-box");
const inputBox = document.getElementById("input-box");

inputBox.onkeyup = () => {
    let result = [];
    let input = inputBox.value;
    if (input.length) {
        result = tags.filter((tag) => {
            return tag.toLowerCase().includes(input.toLowerCase());
        });
    }
    if (result.length === 0) {
        result = ["|    Mest søkte tagger:", "Linux", "VM", "Annet"];
    }
    display(result);

    if(!result.length){
        resultBox.innerHTML = "";
    }
}

function display(result) {
    const content = result.map((list) => {
        return "<li onclick=selectInput(this)>" + list + "</li>";
    }).join('');

    resultBox.innerHTML = "<ul>" + content + "</ul>";
}

function selectInput(list) {
    inputBox.value = list.innerHTML;
    resultBox.innerHTML = "";
}