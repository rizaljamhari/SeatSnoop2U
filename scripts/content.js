async function fetchData(eventID, perfId = null) {
    try {
        const response = await fetch(`https://api1.tiket2u.my/api/event/GetTicketPurchaseInfo?EventID=${eventID}&PerfID=${perfId}`);

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching data:', error);
        return null;
    }
}

function updateTicketInfo(eventID, performances) {
    const performance = performances[0];
    const ticketSections = performance.SectionTicketInfo;

    if (!ticketSections || !ticketSections.length) {
        console.error(`No ticket sections found for performance ID ${performance.PerfID}`);
        return;
    }

    ticketSections.forEach(section => {
        const sectionSelector = `tblrow_${eventID}_${performance.PerfID}_${section.SectionID}`;
        const remainingTickets = section.SectionRemainSeat < 0 ? 0 : section.SectionRemainSeat;
        const sectionElement = document.querySelector(`#${sectionSelector}`);

        if (sectionElement) {
            const cardTitle = sectionElement.querySelector('.card__title');
            if (cardTitle && !cardTitle.querySelector('.ticket-info')) {
                cardTitle.insertAdjacentHTML('beforeend', `<span class="ticket-info" style="color: red;"> (${remainingTickets} tickets left)</span>`);
            }
        }
    });
}

async function handleDOMChanges() {
    const eventDetailSelector = document.querySelector('[itemref="schemaEventDetailSide"]');
    const eventID = eventDetailSelector ? eventDetailSelector.getAttribute('data-id') : null;
    const oTicketInfoItems = await waitForElement('.oTicketInfo__items', true);

    if (!oTicketInfoItems || !oTicketInfoItems.length) {
        console.error('No ticket info items found');
        return;
    }

    oTicketInfoItems.forEach(async (item) => {
        const perfId = item.id.split('_')[1];


        if (!eventID && !perfId) {
            console.error('Event ID and performance ID not found');
            return;
        }

        const eventInfo = await fetchData(eventID, perfId);

        if (!eventInfo) {
            console.error('Failed to fetch event information');
            return;
        }

        const performances = eventInfo.TicketPurchaseInfo;

        if (!performances || !performances.length) {
            console.error('No performance information found');
            return;
        }

        updateTicketInfo(eventID, performances);
    });
}

function waitForElement(selector, multiple = false, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const interval = setInterval(() => {
            const element = multiple ? document.querySelectorAll(selector) : document.querySelector(selector);
            console.log(element);
            if (element) {
                clearInterval(interval);
                resolve(element);
            } else if (Date.now() - startTime > timeout) {
                clearInterval(interval);
            }
        }, 100);
    });
}

// sometimes there's a multiPerformanceDate input, which means there are multiple performances
// observe the multiPerformanceDate input for changes and call handleDOMChanges when it changes

(async () => {
    try {
        const oTicketInfo = await waitForElement('.oTicketInfo');
        const hasDatePicker = document.querySelector('.oPickDateText');
        var multiPerformanceDate = null;
        if (hasDatePicker) {
            multiPerformanceDate = await waitForElement('.multiPerformanceDate');
        }

        // Set up initial update
        await handleDOMChanges();

        const observer = new MutationObserver(() => {
            console.log('DOM changes detected');
            handleDOMChanges();
        });

        observer.observe(oTicketInfo, { childList: true, subtree: true });

        if (multiPerformanceDate) {
            observer.observe(multiPerformanceDate, { attributes: true, childList: true, subtree: true });
        }
    } catch (error) {
        console.error('Error:', error);
    }
})();
