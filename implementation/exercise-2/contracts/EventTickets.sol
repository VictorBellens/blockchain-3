// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title EventTickets
 * @notice Decentralized event ticket booking and resale platform.
 *
 * Design choices:
 * - Events (name, date, price, capacity) are stored on-chain for trustless verification.
 * - Ticket ownership is tracked on-chain (mapping from ticketId → owner address).
 * - Resale listings (price + flag) are on-chain so buyers can verify and purchase atomically.
 * - Rich metadata (images, descriptions) is kept off-chain to save gas.
 */
contract EventTickets {
    address public admin;

    struct Event {
        string name;
        string date;
        string venue;
        uint256 ticketPrice;
        uint256 totalTickets;
        uint256 ticketsSold;
        bool exists;
    }

    struct Ticket {
        uint256 eventId;
        address owner;
        bool forSale;
        uint256 resalePrice;
        bool exists;
    }

    uint256 public nextEventId;
    uint256 public nextTicketId;

    mapping(uint256 => Event) public events;
    mapping(uint256 => Ticket) public tickets;

    event EventCreated(uint256 indexed eventId, string name, uint256 ticketPrice, uint256 totalTickets);
    event TicketPurchased(uint256 indexed ticketId, uint256 indexed eventId, address indexed buyer, uint256 price);
    event TicketTransferred(uint256 indexed ticketId, address indexed from, address indexed to);
    event TicketListedForSale(uint256 indexed ticketId, uint256 price);
    event TicketSaleCompleted(uint256 indexed ticketId, address indexed seller, address indexed buyer, uint256 price);
    event TicketSaleCancelled(uint256 indexed ticketId);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    modifier ticketExists(uint256 _ticketId) {
        require(tickets[_ticketId].exists, "Ticket does not exist");
        _;
    }

    modifier onlyTicketOwner(uint256 _ticketId) {
        require(tickets[_ticketId].owner == msg.sender, "Not the ticket owner");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    /// @notice Create a new event (admin only)
    function createEvent(
        string calldata _name,
        string calldata _date,
        string calldata _venue,
        uint256 _ticketPrice,
        uint256 _totalTickets
    ) external onlyAdmin returns (uint256) {
        require(bytes(_name).length > 0, "Event name required");
        require(_ticketPrice > 0, "Price must be > 0");
        require(_totalTickets > 0, "Must have at least 1 ticket");

        uint256 id = nextEventId;
        events[id] = Event(_name, _date, _venue, _ticketPrice, _totalTickets, 0, true);
        nextEventId++;

        emit EventCreated(id, _name, _ticketPrice, _totalTickets);
        return id;
    }

    /// @notice Buy a ticket for an event by sending the exact ticket price
    function buyTicket(uint256 _eventId) external payable returns (uint256) {
        Event storage evt = events[_eventId];
        require(evt.exists, "Event does not exist");
        require(evt.ticketsSold < evt.totalTickets, "Event is sold out");
        require(msg.value >= evt.ticketPrice, "Insufficient payment");

        evt.ticketsSold++;

        uint256 ticketId = nextTicketId;
        tickets[ticketId] = Ticket(_eventId, msg.sender, false, 0, true);
        nextTicketId++;

        // Refund overpayment
        uint256 excess = msg.value - evt.ticketPrice;
        if (excess > 0) {
            (bool sent, ) = payable(msg.sender).call{value: excess}("");
            require(sent, "Refund failed");
        }

        emit TicketPurchased(ticketId, _eventId, msg.sender, evt.ticketPrice);
        return ticketId;
    }

    /// @notice Transfer a ticket to another address for free
    function transferTicket(uint256 _ticketId, address _to)
        external
        ticketExists(_ticketId)
        onlyTicketOwner(_ticketId)
    {
        require(_to != address(0), "Invalid recipient");
        require(_to != msg.sender, "Cannot transfer to yourself");
        require(!tickets[_ticketId].forSale, "Cancel sale before transferring");

        tickets[_ticketId].owner = _to;
        emit TicketTransferred(_ticketId, msg.sender, _to);
    }

    /// @notice List a ticket for resale at a given price
    function listForSale(uint256 _ticketId, uint256 _price)
        external
        ticketExists(_ticketId)
        onlyTicketOwner(_ticketId)
    {
        require(_price > 0, "Price must be > 0");
        require(!tickets[_ticketId].forSale, "Already listed");

        tickets[_ticketId].forSale = true;
        tickets[_ticketId].resalePrice = _price;
        emit TicketListedForSale(_ticketId, _price);
    }

    /// @notice Cancel a resale listing
    function cancelSale(uint256 _ticketId)
        external
        ticketExists(_ticketId)
        onlyTicketOwner(_ticketId)
    {
        require(tickets[_ticketId].forSale, "Not listed for sale");
        tickets[_ticketId].forSale = false;
        tickets[_ticketId].resalePrice = 0;
        emit TicketSaleCancelled(_ticketId);
    }

    /// @notice Buy a ticket on the resale market
    function buyResale(uint256 _ticketId) external payable ticketExists(_ticketId) {
        Ticket storage ticket = tickets[_ticketId];
        require(ticket.forSale, "Ticket not for sale");
        require(msg.sender != ticket.owner, "Already the owner");
        require(msg.value >= ticket.resalePrice, "Insufficient payment");

        address seller = ticket.owner;
        uint256 price = ticket.resalePrice;

        ticket.owner = msg.sender;
        ticket.forSale = false;
        ticket.resalePrice = 0;

        // Pay the seller
        (bool sent, ) = payable(seller).call{value: price}("");
        require(sent, "Payment to seller failed");

        // Refund excess
        uint256 excess = msg.value - price;
        if (excess > 0) {
            (bool refundSent, ) = payable(msg.sender).call{value: excess}("");
            require(refundSent, "Refund failed");
        }

        emit TicketSaleCompleted(_ticketId, seller, msg.sender, price);
    }

    /// @notice Withdraw contract funds (from primary sales) — admin only
    function withdraw() external onlyAdmin {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds");
        (bool sent, ) = payable(admin).call{value: balance}("");
        require(sent, "Withdrawal failed");
    }

    // ===== VIEW FUNCTIONS =====

    /// @notice Get event details
    function getEventInfo(uint256 _eventId)
        external view
        returns (string memory name, string memory date, string memory venue,
                 uint256 ticketPrice, uint256 totalTickets, uint256 ticketsSold)
    {
        Event storage e = events[_eventId];
        require(e.exists, "Event does not exist");
        return (e.name, e.date, e.venue, e.ticketPrice, e.totalTickets, e.ticketsSold);
    }

    /// @notice Get ticket details
    function getTicket(uint256 _ticketId)
        external view
        returns (uint256 eventId, address owner, bool forSale, uint256 resalePrice)
    {
        Ticket storage t = tickets[_ticketId];
        require(t.exists, "Ticket does not exist");
        return (t.eventId, t.owner, t.forSale, t.resalePrice);
    }

    function getEventCount() external view returns (uint256) { return nextEventId; }
    function getTicketCount() external view returns (uint256) { return nextTicketId; }
}
