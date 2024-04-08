import axios from 'axios';
import * as fs from 'fs';
import * as XLSX from 'xlsx';
import * as readline from 'readline';

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getAllRepos(orgName: string) {
    let page = 1
    const repos = []
    while (true) {
        try {
            await sleep(1500);
            const res = await axios.get(`https://api.github.com/orgs/${orgName}/repos?page=${page}`,
                {
                    headers: {
                        Authorization: 'Bearer YOUR_GITHUB_TOKEN',
                        'Content-Type': 'application/json',
                    }
                })
            if (res.data.length === 0) {
                console.log('All repos added to the list')
                break
            }
            for (let inx = 0; inx < res.data.length; inx++) {
                repos.push(res.data[inx].name)
            }
        } catch (error) {
            console.error('Error:', error);
        }
        page += 1
    }
    return repos

}


async function appendDataToFile(orgName: string, repoName: string): Promise<void> {
    let page = 1
    while (true) {
        try {
            await sleep(1500);
            const res = await axios.get(`https://api.github.com/repos/${orgName}/${repoName}/commits?page=${page}`,
                {
                    headers: {
                        Authorization: `Bearer YOUR_ACCESS_TOKEN`,
                        'Content-Type': 'application/json',
                    }
                });
            const newData = res.data;
            if (newData.length === 0) {
                console.log(`${repoName} repo added`)
                break
            }
            for (let inx = 0; inx < newData.length; inx++) {
                const datePointner = String(newData[inx].commit.committer.date)
                if (Number(datePointner.slice(0, 4)) > 2022 &&
                    Number(datePointner.slice(5, 7)) > 0) {
                    const existingDataString = fs.readFileSync('YOUR_JSON_FILE.json', 'utf-8');
                    const existingData = JSON.parse(existingDataString);
                    const pointner = newData[inx].commit
                    const whatIWant = {
                        author: pointner.author.name,
                        email: pointner.author.email,
                        date: pointner.committer.date,
                        message: pointner.message.split(/\n(.*)/, 2)[0],
                        repo: repoName,
                    }
                    existingData.push(whatIWant);

                    const jsonData = JSON.stringify(existingData);
                    fs.writeFileSync('YOUR_JSON_FILE.json', jsonData);
                }
            }
            page += 1
        } catch (error) {
            console.error('Error:', error.response.data.message);
            console.log(`there was some problems with ${repoName} repo !!!`)
            break
        }
    }

}

function toExel() {
    const jsonFilePath = 'YOUR_JSON_FILE.json';
    const excelFilePath = 'YOUR_EXCEL_FILE.xlsx';

    const jsonData = fs.readFileSync(jsonFilePath, 'utf-8');
    const newJsonData = JSON.parse(jsonData);

    let oldData = [];
    if (fs.existsSync(excelFilePath)) {
        const workbook = XLSX.readFile(excelFilePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        oldData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    }

    const ws = XLSX.utils.sheet_add_json(XLSX.utils.aoa_to_sheet(oldData), newJsonData, { skipHeader: true, origin: -1 });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

    XLSX.writeFile(wb, excelFilePath);

    console.log('Data added to Excel file successfully!');
}

(async () => {
    const orgName = 'YOUR_ORG_NAME'
    const repos = await getAllRepos(orgName);
    for (let inx = 0; inx < repos.length; inx++) {
        await appendDataToFile(orgName, repos[inx])
        console.log(`repoCount aded till now is: ${inx + 1}`)
    }
    toExel()
})();
